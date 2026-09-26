import type { APIRoute } from "astro";
import { findOptions, parseQuery } from "../../lib/finder";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const GET: APIRoute = ({ url }) => {
  const query = parseQuery(url.searchParams);
  return query ? json(findOptions(query)) : json({ error: "invalid" }, 400);
};
