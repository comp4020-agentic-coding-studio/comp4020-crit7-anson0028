# Process overview

## What I built

A study room finder for the ANU Library. The Library's booking page shows a
library's rooms against the day's hours and leaves you to find the gap. Here you
say how many of you, for how long and when you're free, and it lists the spaces
that fit, one per start time. The 81 spaces and their hours are the Library's,
copied from LibCal
([`d4fe20f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-anson0028/commit/d4fe20f)).

## How I got here

The rules went into the database first. A rule about one booking is a CHECK:
half-hour slots, two hours at most, an anu.edu.au email. A rule that needs other
rows is a trigger: no overlap, two hours per person per day, room capacity,
opening hours
([`d4fe20f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-anson0028/commit/d4fe20f)).
Only the two date rules stay in code: they depend on today's date. Trying each
rule by hand caught a right refusal with the wrong reason: a three-hour booking
came back as "daily limit", because SQLite runs triggers before CHECKs.

The spec drives the built server over HTTP
([`8a53a98`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-anson0028/commit/8a53a98)).
Two tests passed for the wrong reason. "Keeps across reload" found the room's
name in the booking form's dropdown, not in the list of bookings. "Won't cancel
someone else's" got a 404 because the cancel route didn't exist yet. Both now
look in the right place. I broke the overlap rule, the 14-day window, the sort
and cancel ownership one at a time, and each turned a named test red.

The finder's first answer was twelve rooms, all at 13:00. The test for one room
per start time went in red before the fix.

The pages borrow their search bar from Airbnb and OpenTable
([`4cb8476`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-anson0028/commit/4cb8476)).

## Thin spots

There is no sign-in. Anyone who types an email sees its bookings and can cancel
them, and the page says so.
