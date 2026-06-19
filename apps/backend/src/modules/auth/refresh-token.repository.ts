import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDB,
} from '../../shared/database/drizzle.constants';
import { type RefreshToken, refreshTokens } from '../../shared/database/schema';

/**
 * better-sqlite3 is synchronous; methods return resolved Promises to keep
 * an async, driver-agnostic repository interface.
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  create(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    this.db
      .insert(refreshTokens)
      .values({ userId, tokenHash, expiresAt })
      .run();
    return Promise.resolve();
  }

  findActiveByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    return Promise.resolve(
      this.db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            isNull(refreshTokens.revokedAt),
          ),
        )
        .get(),
    );
  }

  revoke(id: number): Promise<void> {
    this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id))
      .run();
    return Promise.resolve();
  }

  revokeAllForUser(userId: number): Promise<void> {
    this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      )
      .run();
    return Promise.resolve();
  }
}
