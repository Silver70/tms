/**
 * Parses durations like `15m`, `7d`, `12h`, `30s` into milliseconds.
 * Falls back to a raw number of milliseconds if the format is unrecognised.
 */
export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return Number(value) || 0;
  const factors: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return Number(match[1]) * factors[match[2]];
}
