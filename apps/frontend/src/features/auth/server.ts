import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader, setCookie } from '@tanstack/react-start/server';
import { API_URL } from './api';
import type { SessionResponse, User } from './types';

/**
 * Resolves the current user on the server by forwarding the browser's httpOnly
 * cookies to the API. If the access token has expired it transparently refreshes
 * and relays the new cookies back to the browser. Returns `null` when signed out.
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<User | null> => {
    const cookie = getRequestHeader('cookie') ?? '';
    if (!cookie) return null;

    try {
      const meRes = await fetch(`${API_URL}/auth/me`, { headers: { cookie } });
      if (meRes.ok) return (await meRes.json()) as User;
      if (meRes.status !== 401) return null;

      // Access token expired — try to refresh and relay the rotated cookies.
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: '{}',
      });
      if (!refreshRes.ok) return null;

      relaySetCookies(refreshRes);
      const { user } = (await refreshRes.json()) as SessionResponse;
      return user;
    } catch {
      // API unreachable — degrade to signed-out rather than crashing SSR.
      return null;
    }
  },
);

/** Forward the API's Set-Cookie headers onto the SSR response to the browser. */
function relaySetCookies(res: Response): void {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    const maxAge = /max-age=(\d+)/i.exec(raw)?.[1];
    setCookie(name, value, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false, // dev over http://localhost; set true behind HTTPS
      ...(maxAge ? { maxAge: Number(maxAge) } : {}),
    });
  }
}
