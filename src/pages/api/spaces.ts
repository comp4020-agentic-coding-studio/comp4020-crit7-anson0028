import type { APIRoute } from "astro";
import { libraryExists, listSpaces } from "../../lib/bookings";

export const GET: APIRoute = ({ url }) => {
  const library = url.searchParams.get("library") ?? "";
  if (!libraryExists(library)) {
    return new Response(JSON.stringify({ error: "unknown_library" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(listSpaces(library)), {
    headers: { "content-type": "application/json" },
  });
};
