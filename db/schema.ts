import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  forwardingEmail: text("forwarding_email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  title: text("title").notNull(),
  originalContent: text("original_content").notNull(),
  summary: jsonb("summary"),
  audioUrl: text("audio_url"),
  sourceEmail: text("source_email"),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playlistContents = pgTable("playlist_contents", {
  id: serial("id").primaryKey(),
  playlistId: serial("playlist_id").references(() => playlists.id),
  contentId: serial("content_id").references(() => contents.id),
  order: serial("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Content = typeof contents.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type PlaylistContent = typeof playlistContents.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertContentSchema = createInsertSchema(contents);
export const selectContentSchema = createSelectSchema(contents);

export const insertPlaylistSchema = createInsertSchema(playlists);
export const selectPlaylistSchema = createSelectSchema(playlists);
