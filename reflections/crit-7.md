# Crit 7 — Build the ANU system you wish existed

**The breakthrough.**

I started out rebuilding the Library's booking page: a list of rooms, a form, a
page of my bookings. It worked, and it was no better than the real one. The real
page shows a library's rooms against the day's hours and I scan the grid for a
gap. The question I actually have is shorter: three of us, an hour, free after
lunch, where can we go?

Making that question the home page was the breakthrough. The rules were already
written down, so the finder only had to check the same things a booking gets
refused for: overlap, capacity, opening hours, the two-week window and my two
hours for the day. Its first answer was twelve rooms all at 13:00, which was
correct and useless. Now it gives one room per start time.

**What it changed.**

Two of my tests were green for the wrong reason. One was looking in the wrong
place: it found a room's name in a dropdown, not in my bookings. The other was
testing code I hadn't written yet: it checked that a stranger can't cancel my
booking, and passed because the cancel route didn't exist.

In crit 5 I wrote that I wanted to keep asking what a green result is made of.
This week I asked it before I believed a test instead of after something broke:
break the thing on purpose and see the test fail for the reason on its label. I
also want to keep putting a rule where it can't be skipped. A trigger refuses a
double booking whichever page sends it.
