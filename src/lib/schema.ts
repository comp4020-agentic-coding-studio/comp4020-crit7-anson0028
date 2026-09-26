import { sql } from "drizzle-orm";
import { check, index, int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const libraries = sqliteTable("libraries", {
  id: text().primaryKey(),
  name: text().notNull(),
});

export const spaces = sqliteTable(
  "spaces",
  {
    id: int().primaryKey({ autoIncrement: true }),
    libraryId: text("library_id")
      .notNull()
      .references(() => libraries.id),
    name: text().notNull(),
    category: text().notNull(),
    capacity: int().notNull(),
  },
  (t) => [
    index("spaces_library").on(t.libraryId),
    check("capacity_positive", sql`${t.capacity} > 0`),
  ],
);

export const openingHours = sqliteTable(
  "opening_hours",
  {
    libraryId: text("library_id")
      .notNull()
      .references(() => libraries.id),
    weekday: int().notNull(),
    openMin: int("open_min").notNull(),
    closeMin: int("close_min").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.libraryId, t.weekday] }),
    check("weekday_range", sql`${t.weekday} BETWEEN 0 AND 6`),
    check("hours_order", sql`0 <= ${t.openMin} AND ${t.openMin} < ${t.closeMin} AND ${t.closeMin} <= 1440`),
  ],
);

export const bookings = sqliteTable(
  "bookings",
  {
    id: int().primaryKey({ autoIncrement: true }),
    spaceId: int("space_id")
      .notNull()
      .references(() => spaces.id),
    email: text().notNull(),
    date: text().notNull(),
    startMin: int("start_min").notNull(),
    endMin: int("end_min").notNull(),
    partySize: int("party_size").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index("bookings_space_date").on(t.spaceId, t.date),
    index("bookings_email_date").on(t.email, t.date),
    check("iso_date", sql`${t.date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
    check("ends_after_start", sql`${t.endMin} > ${t.startMin}`),
    check("within_a_day", sql`${t.startMin} >= 0 AND ${t.endMin} <= 1440`),
    check("half_hour_slots", sql`${t.startMin} % 30 = 0 AND ${t.endMin} % 30 = 0`),
    check("at_most_two_hours", sql`${t.endMin} - ${t.startMin} <= 120`),
    check("anu_email", sql`lower(${t.email}) LIKE '%@anu.edu.au'`),
    check("party_positive", sql`${t.partySize} >= 1`),
  ],
);

export type Library = typeof libraries.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
