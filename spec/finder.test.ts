import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

type Option = { spaceId: number; space: string; library: string; capacity: number; startMin: number; endMin: number; others: number };
type Answer = { options: Option[]; total: number; remaining: number | null; refused: string | null };

const canberraToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Canberra" }).format(new Date());

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const nextWeekday = (iso: string) => {
  let d = addDays(iso, 1);
  while ([0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())) d = addDays(d, 1);
  return d;
};

const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const student = (tag: string) => `u${tag}${process.hrtime.bigint() % 10_000_000n}@anu.edu.au`;

const free = async (params: Record<string, string | number>) => {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(new URL(`/api/free?${qs}`, baseUrl));
  return { status: res.status, answer: (await res.json()) as Answer };
};

const book = (fields: Record<string, string | number>) =>
  fetch(new URL("/api/bookings", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams(Object.entries(fields).map(([k, v]) => [k, String(v)])),
    redirect: "manual",
  });

describe("finding a room", () => {
  let day: string;
  let lawRoom: number;

  beforeAll(async () => {
    day = nextWeekday(nextWeekday(canberraToday()));
    const res = await fetch(new URL("/api/spaces?library=law", baseUrl));
    lawRoom = ((await res.json()) as { id: number; name: string }[]).find((s) => s.name === "Study room 1")?.id ?? 0;
  });

  it("answers with rooms that fit the group, the length and the window", async () => {
    const { status, answer } = await free({ date: day, from: "10:00", until: "12:00", minutes: 60, people: 2, library: "chifley", email: student("fit") });
    expect(status).toBe(200);
    expect(answer.options.length).toBeGreaterThan(0);
    for (const o of answer.options) {
      expect(o.capacity).toBeGreaterThanOrEqual(2);
      expect(o.endMin - o.startMin).toBe(60);
      expect(o.startMin).toBeGreaterThanOrEqual(600);
      expect(o.endMin).toBeLessThanOrEqual(720);
    }
  });

  it("puts the earliest start first, and the smallest room that fits first within it", async () => {
    const { answer } = await free({ date: day, from: "10:00", until: "12:00", minutes: 60, people: 2, library: "chifley", email: student("order") });
    const starts = answer.options.map((o) => o.startMin);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(answer.options[0]?.capacity).toBe(2);
  });

  it("gives one room per start time, so the whole window shows", async () => {
    const { answer } = await free({ date: day, from: "13:00", until: "17:00", minutes: 120, people: 2, email: student("spread") });
    const starts = answer.options.map((o) => o.startMin);
    expect(new Set(starts).size).toBe(starts.length);
    expect(starts).toEqual([780, 810, 840, 870, 900]);
    expect(answer.options[0].others).toBeGreaterThan(0);
  });

  it("stops offering a slot once it is booked", async () => {
    const email = student("gone");
    const { answer } = await free({ date: day, from: "13:00", until: "15:00", minutes: 60, people: 2, library: "chifley", email });
    const first = answer.options[0];
    expect(first).toBeDefined();
    const res = await book({ spaceId: first.spaceId, email, date: day, start: clock(first.startMin), end: clock(first.endMin), partySize: 2 });
    expect(res.status).toBe(303);

    const again = await free({ date: day, from: "13:00", until: "15:00", minutes: 60, people: 2, library: "chifley", email: student("other") });
    expect(again.answer.options.some((o) => o.spaceId === first.spaceId && o.startMin === first.startMin)).toBe(false);
  });

  it("never offers more time than the student has left that day", async () => {
    const email = student("left");
    expect((await book({ spaceId: lawRoom, email, date: day, start: "10:00", end: "11:30", partySize: 1 })).status).toBe(303);

    const tooLong = await free({ date: day, from: "12:00", until: "18:00", minutes: 60, people: 1, library: "law", email });
    expect(tooLong.answer.refused).toBe("daily_limit");
    expect(tooLong.answer.remaining).toBe(30);
    expect(tooLong.answer.options).toEqual([]);

    const fits = await free({ date: day, from: "12:00", until: "18:00", minutes: 30, people: 1, library: "law", email });
    expect(fits.answer.refused).toBeNull();
    expect(fits.answer.options.length).toBeGreaterThan(0);
  });

  it("keeps to the library's opening hours", async () => {
    const { answer } = await free({ date: day, from: "08:00", until: "12:00", minutes: 60, people: 2, library: "menzies", email: student("hours") });
    expect(answer.options.length).toBeGreaterThan(0);
    for (const o of answer.options) expect(o.startMin).toBeGreaterThanOrEqual(600);
  });

  it("does not offer spaces kept for a special purpose", async () => {
    const { answer } = await free({ date: day, from: "16:00", until: "18:00", minutes: 60, people: 1, email: student("special") });
    expect(answer.total).toBeGreaterThan(0);
    const names = answer.options.map((o) => o.space);
    expect(names).not.toContain("Accessibility Computer");
    expect(names).not.toContain("Microfilm Scanner");
  });

  it("refuses a query it cannot read", async () => {
    expect((await free({ date: "soon", from: "10:00", until: "12:00", minutes: 60, people: 2 })).status).toBe(400);
    expect((await free({ date: day, from: "12:00", until: "10:00", minutes: 60, people: 2 })).status).toBe(400);
    expect((await free({ date: day, from: "10:00", until: "12:00", minutes: 45, people: 2 })).status).toBe(400);
  });

  it("lists the answers on the home page, and booking one from there works", async () => {
    const email = student("home");
    const qs = new URLSearchParams({ date: day, from: "10:00", until: "12:00", minutes: "60", people: "3", library: "hancock", email });
    const res = await fetch(new URL(`/?${qs}`, baseUrl));
    expect(res.status).toBe(200);
    const doc = new JSDOM(await res.text()).window.document;
    const forms = doc.querySelectorAll("#options li form");
    expect(forms.length).toBeGreaterThan(0);

    const fields = Object.fromEntries(
      [...forms[0].querySelectorAll("input")].map((input) => [input.getAttribute("name") ?? "", input.getAttribute("value") ?? ""]),
    );
    expect(fields.email).toBe(email);
    expect((await book(fields)).status).toBe(303);

    const list = new JSDOM(await (await fetch(new URL(`/bookings/?email=${encodeURIComponent(email)}`, baseUrl))).text()).window.document;
    expect(list.querySelector("#bookings")?.textContent).toContain("Hancock Library");
  });
});
