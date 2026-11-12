import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  userId: text('user_id').primaryKey(),
  document: text('document').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  storageKey: text('storage_key').notNull().unique(),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('assets_user_id_idx').on(table.userId)]);

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').notNull(),
  ownerEmail: text('owner_email').notNull(),
  title: text('title').notNull(),
  document: text('document').notNull(),
  revision: integer('revision').notNull().default(1),
  lastOperationKey: text('last_operation_key'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [index('rooms_owner_idx').on(table.ownerUserId)]);

export const roomMembers = sqliteTable('room_members', {
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [primaryKey({ columns: [table.roomId, table.email] }), index('room_members_email_idx').on(table.email)]);

export const roomOperations = sqliteTable('room_operations', {
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  operationId: text('operation_id').notNull(),
  requestHash: text('request_hash').notNull(),
  revision: integer('revision').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [primaryKey({ columns: [table.roomId, table.userId, table.operationId] })]);

export const roomAssets = sqliteTable('room_assets', {
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
}, table => [primaryKey({ columns: [table.roomId, table.assetId] }), index('room_assets_asset_idx').on(table.assetId)]);

export const roomPresence = sqliteTable('room_presence', {
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  sessionId: text('session_id').notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  boardId: text('board_id').notNull(),
  x: real('x'),
  y: real('y'),
  selectedNodeId: text('selected_node_id'),
  updatedAt: integer('updated_at').notNull(),
}, table => [primaryKey({ columns: [table.roomId, table.userId, table.sessionId] }), index('room_presence_active_idx').on(table.roomId, table.updatedAt)]);
