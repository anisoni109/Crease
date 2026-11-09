import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
 code: text('code').primaryKey(), state: text('state').notNull(),
 version: integer('version').notNull().default(0), updatedAt: integer('updated_at').notNull(),
});
export const captainProfiles=sqliteTable('captain_profiles',{
 id:text('id').primaryKey(),secretHash:text('secret_hash').notNull(),name:text('name').notNull(),avatar:integer('avatar').notNull().default(0),createdAt:integer('created_at').notNull(),
});
export const savedMatches=sqliteTable('saved_matches',{
 id:text('id').primaryKey(),roomCode:text('room_code'),mode:text('mode').notNull(),completedAt:integer('completed_at').notNull(),summary:text('summary').notNull(),listing:text('listing').notNull(),
});
export const matchCaptains=sqliteTable('match_captains',{
 matchId:text('match_id').notNull(),captainId:text('captain_id').notNull(),name:text('name').notNull(),avatar:integer('avatar').notNull().default(0),team:integer('team').notNull(),result:text('result').notNull(),runs:integer('runs').notNull(),wickets:integer('wickets').notNull(),fours:integer('fours').notNull(),sixes:integer('sixes').notNull(),balls:integer('balls').notNull(),bowlingBalls:integer('bowling_balls').notNull(),runsConceded:integer('runs_conceded').notNull(),
},t=>[primaryKey({columns:[t.matchId,t.captainId]}),index('match_captains_captain_idx').on(t.captainId)]);
