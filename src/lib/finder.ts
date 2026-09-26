import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { addDays, canberraNow, type Moment, toMinutes, WINDOW_DAYS } from "./bookings";
import { db } from "./db";
import { bookings, libraries, openingHours, spaces } from "./schema";

export const FINDABLE = ["Study Room", "Study Booth", "The Deck", "Computer Desk"];
export const DAILY_MINUTES = 120;
export const LIMIT = 12;

export type Query = {
  date: string;
  fromMin: number;
  untilMin: number;
  minutes: number;
  people: number;
  library?: string;
  email?: string;
};

export type Option = {
  spaceId: number;
  space: string;
  library: string;
  capacity: number;
  startMin: number;
  endMin: number;
  others: number;
};

export type Answer = {
  options: Option[];
  total: number;
  remaining: number | null;
  refused: "in_the_past" | "too_far_ahead" | "daily_limit" | null;
};

const ceilToSlot = (minutes: number) => Math.ceil(minutes / 30) * 30;

export function findOptions(query: Query, now: Moment = canberraNow()): Answer {
  const email = query.email?.trim().toLowerCase() || undefined;
  const used = email
    ? (db
        .select({ used: sql<number>`coalesce(sum(${bookings.endMin} - ${bookings.startMin}), 0)` })
        .from(bookings)
        .where(and(eq(bookings.email, email), eq(bookings.date, query.date)))
        .get()?.used ?? 0)
    : null;
  const remaining = used === null ? null : Math.max(0, DAILY_MINUTES - used);

  const empty = (refused: Answer["refused"]): Answer => ({ options: [], total: 0, remaining, refused });
  if (query.date < now.date) return empty("in_the_past");
  if (query.date > addDays(now.date, WINDOW_DAYS)) return empty("too_far_ahead");
  if (remaining !== null && query.minutes > remaining) return empty("daily_limit");

  const weekday = new Date(`${query.date}T12:00:00Z`).getUTCDay();
  const hours = new Map(
    db
      .select()
      .from(openingHours)
      .where(eq(openingHours.weekday, weekday))
      .all()
      .map((h) => [h.libraryId, h]),
  );

  const candidates = db
    .select({
      spaceId: spaces.id,
      space: spaces.name,
      capacity: spaces.capacity,
      libraryId: spaces.libraryId,
      library: libraries.name,
    })
    .from(spaces)
    .innerJoin(libraries, eq(libraries.id, spaces.libraryId))
    .where(
      and(
        gte(spaces.capacity, query.people),
        inArray(spaces.category, FINDABLE),
        query.library ? eq(spaces.libraryId, query.library) : undefined,
      ),
    )
    .all();

  const taken = new Map<number, { startMin: number; endMin: number }[]>();
  for (const b of db
    .select({ spaceId: bookings.spaceId, startMin: bookings.startMin, endMin: bookings.endMin })
    .from(bookings)
    .where(eq(bookings.date, query.date))
    .all()) {
    taken.set(b.spaceId, [...(taken.get(b.spaceId) ?? []), b]);
  }

  const earliest = ceilToSlot(query.date === now.date ? Math.max(query.fromMin, now.minutes) : query.fromMin);
  const options: Omit<Option, "others">[] = [];
  for (let start = earliest; start + query.minutes <= query.untilMin; start += 30) {
    const end = start + query.minutes;
    for (const c of candidates) {
      const open = hours.get(c.libraryId);
      if (!open || start < open.openMin || end > open.closeMin) continue;
      if ((taken.get(c.spaceId) ?? []).some((b) => b.startMin < end && start < b.endMin)) continue;
      options.push({ spaceId: c.spaceId, space: c.space, library: c.library, capacity: c.capacity, startMin: start, endMin: end });
    }
  }

  options.sort(
    (a, b) =>
      a.startMin - b.startMin ||
      a.capacity - b.capacity ||
      a.library.localeCompare(b.library) ||
      a.spaceId - b.spaceId,
  );
  const best = new Map<number, Option>();
  for (const o of options) {
    const kept = best.get(o.startMin);
    if (kept) kept.others += 1;
    else best.set(o.startMin, { ...o, others: 0 });
  }
  const perStart = [...best.values()];
  return { options: perStart.slice(0, LIMIT), total: perStart.length, remaining, refused: null };
}

export const DURATIONS = [30, 60, 90, 120];

export function parseQuery(params: URLSearchParams): Query | null {
  const date = params.get("date") ?? "";
  const fromMin = toMinutes(params.get("from") ?? "");
  const untilMin = toMinutes(params.get("until") ?? "");
  const minutes = Number(params.get("minutes"));
  const people = Number(params.get("people"));
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    fromMin === null ||
    untilMin === null ||
    fromMin >= untilMin ||
    !DURATIONS.includes(minutes) ||
    !Number.isInteger(people) ||
    people < 1
  ) {
    return null;
  }
  return {
    date,
    fromMin,
    untilMin,
    minutes,
    people,
    library: params.get("library") || undefined,
    email: params.get("email") || undefined,
  };
}
