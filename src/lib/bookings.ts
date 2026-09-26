import { and, asc, eq } from "drizzle-orm";
import { db } from "./db";
import { bookings, libraries, spaces } from "./schema";

export const WINDOW_DAYS = 14;

export type Reason =
  | "overlap"
  | "daily_limit"
  | "capacity"
  | "closed"
  | "too_far_ahead"
  | "in_the_past"
  | "anu_email"
  | "at_most_two_hours"
  | "half_hour_slots"
  | "ends_after_start"
  | "unknown_space"
  | "invalid";

export const REASONS: Record<Reason, string> = {
  overlap: "Someone already has that room for part of that time.",
  daily_limit: "That would take you past two hours of bookings on that day.",
  capacity: "That room isn't big enough for your group.",
  closed: "The library isn't open for the whole of that time.",
  too_far_ahead: "Bookings open two weeks ahead, and that date is further out.",
  in_the_past: "That time has already passed.",
  anu_email: "Bookings need an ANU email address.",
  at_most_two_hours: "One booking can be at most two hours.",
  half_hour_slots: "Bookings start and end on the hour or the half hour.",
  ends_after_start: "A booking has to end after it starts.",
  unknown_space: "That room doesn't exist.",
  invalid: "Something in the form was missing or malformed.",
};

export type Moment = { date: string; minutes: number };

export const canberraNow = (now = new Date()): Moment => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Canberra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
};

export const canberraToday = (now = new Date()) => canberraNow(now).date;

export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const toMinutes = (clock: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[2]) < 60 && minutes <= 1440 ? minutes : null;
};

export const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;

export function listLibraries() {
  return db.select().from(libraries).orderBy(asc(libraries.name)).all();
}

export function listSpaces(libraryId: string) {
  return db
    .select({ id: spaces.id, name: spaces.name, category: spaces.category, capacity: spaces.capacity })
    .from(spaces)
    .where(eq(spaces.libraryId, libraryId))
    .orderBy(asc(spaces.id))
    .all();
}

export function listBookings(email: string) {
  return db
    .select({
      id: bookings.id,
      date: bookings.date,
      startMin: bookings.startMin,
      endMin: bookings.endMin,
      partySize: bookings.partySize,
      space: spaces.name,
      library: libraries.name,
    })
    .from(bookings)
    .innerJoin(spaces, eq(spaces.id, bookings.spaceId))
    .innerJoin(libraries, eq(libraries.id, spaces.libraryId))
    .where(eq(bookings.email, email.trim().toLowerCase()))
    .orderBy(asc(bookings.date), asc(bookings.startMin))
    .all();
}

const reasonFromError = (error: unknown): Reason => {
  const message = error instanceof Error ? error.message : String(error);
  for (const reason of ["overlap", "daily_limit", "capacity", "closed"] as const) {
    if (message === reason) return reason;
  }
  const check = /CHECK constraint failed: (\w+)/.exec(message)?.[1];
  if (check && check in REASONS) return check as Reason;
  if (message.includes("FOREIGN KEY")) return "unknown_space";
  return "invalid";
};

type Outcome = { ok: true; email: string } | { ok: false; reason: Reason };

export function createBooking(form: FormData, now = canberraNow()): Outcome {
  const spaceId = Number(form.get("spaceId"));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const date = String(form.get("date") ?? "");
  const startMin = toMinutes(String(form.get("start") ?? ""));
  const endMin = toMinutes(String(form.get("end") ?? ""));
  const partySize = Number(form.get("partySize"));

  if (!Number.isInteger(spaceId) || !email || !isDate(date) || startMin === null || endMin === null || !Number.isInteger(partySize)) {
    return { ok: false, reason: "invalid" };
  }
  if (date < now.date || (date === now.date && startMin < now.minutes)) return { ok: false, reason: "in_the_past" };
  if (date > addDays(now.date, WINDOW_DAYS)) return { ok: false, reason: "too_far_ahead" };
  if (!db.select({ id: spaces.id }).from(spaces).where(eq(spaces.id, spaceId)).get()) {
    return { ok: false, reason: "unknown_space" };
  }

  try {
    db.insert(bookings).values({ spaceId, email, date, startMin, endMin, partySize }).run();
    return { ok: true, email };
  } catch (error) {
    return { ok: false, reason: reasonFromError(error) };
  }
}

export function cancelBooking(id: number, email: string) {
  if (!Number.isInteger(id) || !email.trim()) return false;
  const result = db
    .delete(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.email, email.trim().toLowerCase())))
    .run();
  return result.changes > 0;
}

export function libraryExists(libraryId: string) {
  return Boolean(db.select({ id: libraries.id }).from(libraries).where(eq(libraries.id, libraryId)).get());
}
