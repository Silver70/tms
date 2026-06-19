import { relations } from 'drizzle-orm';
import { roles } from './roles.schema';
import { users } from './users.schema';
import { refreshTokens } from './refresh-tokens.schema';

export * from './roles.schema';
export * from './users.schema';
export * from './refresh-tokens.schema';

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));
