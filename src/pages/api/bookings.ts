import type { APIRoute } from "astro";
import { REASONS, createBooking } from "../../lib/bookings";
import { messagePage } from "../../lib/page";

export const POST: APIRoute = async ({ request, redirect }) => {
  const outcome = createBooking(await request.formData());
  if (outcome.ok) return redirect(`/bookings/?email=${encodeURIComponent(outcome.email)}`, 303);
  return messagePage({
    title: "Not booked",
    message: REASONS[outcome.reason],
    status: 422,
    reason: outcome.reason,
    actions: `<a href="/">Find another room</a><a href="/book/">Pick one yourself</a>`,
  });
};
