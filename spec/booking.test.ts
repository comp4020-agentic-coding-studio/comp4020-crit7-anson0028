import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

type Space = { id: number; name: string; category: string; capacity: number };

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

const student = (tag: string) => `u${tag}${process.hrtime.bigint() % 10_000_000n}@anu.edu.au`;

const book = (fields: Record<string, string | number>) =>
  fetch(new URL("/api/bookings", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams(Object.entries(fields).map(([k, v]) => [k, String(v)])),
    redirect: "manual",
  });

const cancelForms = async (email: string) => {
  const res = await fetch(new URL(`/bookings/?email=${encodeURIComponent(email)}`, baseUrl));
  const doc = new JSDOM(await res.text()).window.document;
  return [...doc.querySelectorAll("#bookings form")].map((form) =>
    Object.fromEntries([...form.querySelectorAll("input")].map((i) => [i.getAttribute("name") ?? "", i.getAttribute("value") ?? ""])),
  );
};

const cancel = (fields: Record<string, string>) =>
  fetch(new URL("/api/bookings/cancel", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });

const bookingsList = async (email: string) => {
  const res = await fetch(new URL(`/bookings/?email=${encodeURIComponent(email)}`, baseUrl));
  const doc = new JSDOM(await res.text()).window.document;
  return { status: res.status, text: doc.querySelector("#bookings")?.textContent ?? "" };
};

describe("library booking", () => {
  const spaces = new Map<string, Space>();
  let day: string;

  beforeAll(async () => {
    for (const library of ["chifley", "menzies"]) {
      const res = await fetch(new URL(`/api/spaces?library=${library}`, baseUrl));
      expect(res.status, `GET /api/spaces?library=${library}`).toBe(200);
      for (const space of (await res.json()) as Space[]) spaces.set(`${library}/${space.name}`, space);
    }
    day = nextWeekday(canberraToday());
  });

  const id = (key: string) => {
    const space = spaces.get(key);
    if (!space) throw new Error(`no space ${key}`);
    return space.id;
  };

  it("lets you pick the library before the room on the booking page", async () => {
    const doc = new JSDOM(await (await fetch(new URL("/book/?library=hancock", baseUrl))).text()).window.document;
    const libraries = [...doc.querySelectorAll("#library option")].map((o) => o.textContent?.trim());
    expect(libraries).toEqual(["Chifley Library", "Hancock Library", "Law Library", "Menzies Library"]);
    expect(doc.querySelector<HTMLSelectElement>("#library")?.value).toBe("hancock");
    const hancock = [...doc.querySelectorAll('#spaceId optgroup[data-library="hancock"] option')];
    expect(hancock.map((o) => o.textContent?.trim())).toContain("Study room 3.37 · 3 people");
    expect(hancock.length).toBe(9);
  });

  it("lists the real rooms with their capacities", () => {
    expect(spaces.get("chifley/Study room 1.01")?.capacity).toBe(4);
    expect(spaces.get("chifley/Study room 4.02")?.capacity).toBe(2);
    expect(spaces.get("menzies/Study room 115A")?.capacity).toBe(7);
  });

  it("keeps a booking across a reload", async () => {
    const email = student("keep");
    const res = await book({ spaceId: id("chifley/Study room 1.01"), email, date: day, start: "10:00", end: "11:00", partySize: 2 });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/bookings/?email=${encodeURIComponent(email)}`);

    const list = await bookingsList(email);
    expect(list.status).toBe(200);
    expect(list.text).toContain("Study room 1.01");
    expect(list.text).toContain("10:00");
  });

  it("refuses a booking that overlaps another in the same room, and writes nothing", async () => {
    const first = student("first");
    const second = student("second");
    const room = id("chifley/Study room 1.03");
    expect((await book({ spaceId: room, email: first, date: day, start: "12:00", end: "13:00", partySize: 1 })).status).toBe(303);

    const res = await book({ spaceId: room, email: second, date: day, start: "12:30", end: "13:30", partySize: 1 });
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("overlap");
    expect((await bookingsList(second)).text).not.toContain("Study room 1.03");
  });

  it("refuses more than two hours in a day for one student", async () => {
    const email = student("limit");
    expect((await book({ spaceId: id("chifley/Study room 1.04"), email, date: day, start: "13:00", end: "15:00", partySize: 1 })).status).toBe(303);

    const res = await book({ spaceId: id("chifley/Study room 1.05"), email, date: day, start: "16:00", end: "16:30", partySize: 1 });
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("daily_limit");
  });

  it("refuses a party larger than the room", async () => {
    const res = await book({ spaceId: id("chifley/Study room 4.03"), email: student("big"), date: day, start: "09:00", end: "10:00", partySize: 3 });
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("capacity");
  });

  it("refuses a booking outside the library's opening hours", async () => {
    const res = await book({ spaceId: id("menzies/Study room 115C"), email: student("early"), date: day, start: "08:00", end: "09:00", partySize: 2 });
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("closed");
  });

  it("refuses a booking more than two weeks ahead", async () => {
    const res = await book({ spaceId: id("chifley/Study room 1.06"), email: student("far"), date: addDays(canberraToday(), 15), start: "10:00", end: "11:00", partySize: 1 });
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("too_far_ahead");
  });

  it("refuses an email that is not an ANU address", async () => {
    const res = await book({ spaceId: id("chifley/Study room 1.06"), email: "someone@gmail.com", date: day, start: "10:00", end: "11:00", partySize: 1 });
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("anu_email");
  });

  it("cancels a booking and frees the room for someone else", async () => {
    const email = student("cancel");
    const slot = { spaceId: id("chifley/Study Room 2.02G"), date: day, start: "17:00", end: "18:00", partySize: 2 };
    expect((await book({ ...slot, email })).status).toBe(303);

    const [form] = await cancelForms(email);
    expect(form).toBeDefined();
    const res = await cancel(form);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/bookings/?email=${encodeURIComponent(email)}`);
    expect((await bookingsList(email)).text).not.toContain("Study Room 2.02G");
    expect((await book({ ...slot, email: student("next") })).status).toBe(303);
  });

  it("will not cancel someone else's booking", async () => {
    const owner = student("owner");
    expect((await book({ spaceId: id("chifley/Study room 3.04"), email: owner, date: day, start: "17:00", end: "18:00", partySize: 1 })).status).toBe(303);
    const [form] = await cancelForms(owner);
    expect(form?.id).toBeTruthy();

    const res = await cancel({ ...form, email: student("stranger") });
    expect(res.status).toBe(404);
    expect((await bookingsList(owner)).text).toContain("Study room 3.04");
    expect((await cancel(form)).status).toBe(303);
  });
});
