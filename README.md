# Study room finder

A study room finder for the ANU Library. When I book a room on LibCal, it shows
a library's rooms against the day's hours and I scan the grid for a gap. Here
you say how many of you there are, how long you need and when you're free, and
it lists the spaces that fit. You book with your ANU email and cancel from the
Your bookings page.

This is a student prototype. The 81 spaces (mostly study rooms, booths and
computer desks) and their usual hours were copied from
[anu.libcal.com](https://anu.libcal.com) in September 2026, but nothing here
books a real room, and a space free here may be taken there. To book one, use
LibCal. There's no sign-in: anyone who types your email can see and cancel your
bookings.

## What good looks like here

**It answers the question I walk in with:** three of us, an hour, free after
lunch, where can we go? The answer is a short list, earliest first. For each
start time it shows the smallest space that fits, so two people don't get
Chifley's eight-seat Deck, and says how many others are free then.

**The Library's rules hold.** LibCal publishes four: two hours a day, up to two
weeks ahead, an ANU email, and only while the library is open. I added three:
half-hour slots, no overlaps, and no more people than the room holds. Here one
two-hour limit covers rooms, desks and booths together. The Library limits them
separately. The date rules, nothing in the past and nothing past 14 days, need
today's date in Canberra, so they live in the app. The database refuses the rest
itself, as CHECKs in `src/lib/schema.ts` and triggers in
`drizzle/0002_booking_rules.sql`, so no page can skip them. A refused booking
says why.

**The finder checks the same things.** It leaves out anything that overlaps,
doesn't fit, falls outside opening hours or the dates you can book, or goes past
what's left of your two hours that day. It doesn't check that the email is an
ANU one. Booking does.

## What I looked at

LibCal for the spaces, the hours and its published limits. Airbnb and OpenTable
for a search bar that asks a few questions at once.

## What I didn't build

- Sign-in, confirmation emails, check-in, or any connection to LibCal.
- Public holidays: Menzies still takes bookings on Labour Day, 5 October, when
  it's closed.
- Changing a booking: cancel and book again.
- The Accessibility Computer and the Microfilm Scanner in the finder. Nobody
  looks for them by group size, and the Book a room page still lists them.

## What's checked, and what's judged

My tests, `spec/booking.test.ts` and `spec/finder.test.ts`, drive the running
app over HTTP: six of the refusals (overlap, daily limit, capacity, opening
hours, too far ahead, non-ANU email), cancelling, cancelling with someone else's
email, the finder's order, one space per start time, a booked slot disappearing,
and the minutes left that day. Half-hour slots, a single booking over two hours
and times in the past have no test yet. The course template's tests check each
page's structure and run a basic accessibility scan.

Whether the space it picks is the one you'd pick, and whether the pages read
clearly on a phone, are judgement calls. I checked those by booking and
cancelling in a browser at phone and desktop widths.
