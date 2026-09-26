import type { APIRoute } from "astro";
import { cancelBooking } from "../../../lib/bookings";
import { messagePage } from "../../../lib/page";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (cancelBooking(Number(form.get("id")), email)) {
    return redirect(`/bookings/?email=${encodeURIComponent(email)}`, 303);
  }
  return messagePage({
    title: "Nothing to cancel",
    message: "There's no booking like that under that email.",
    status: 404,
    actions: `<a href="/bookings/">Look up your bookings</a>`,
  });
};
