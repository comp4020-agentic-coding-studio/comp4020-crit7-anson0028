const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export function messagePage(options: { title: string; message: string; status: number; reason?: string; actions: string }) {
  const html = `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(options.title)} · Study room finder</title>
    <style>
      body { margin: 0; background: #f6f6f3; color: #15171c; font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      .topbar { background: #fff; border-bottom: 1px solid #e3e5e9; }
      .topbar div { display: flex; flex-wrap: wrap; gap: .75rem 1.5rem; align-items: center; max-width: 64rem; margin: 0 auto; padding: .8rem 1.25rem; }
      .topbar strong { margin-right: auto; }
      nav { display: flex; gap: .2rem; }
      nav a { padding: .4rem .8rem; border-radius: 999px; color: #5b6270; text-decoration: none; font-weight: 500; }
      main { max-width: 34rem; margin: 3rem auto; padding: 1.75rem; background: #fff; border: 1px solid #e3e5e9; border-radius: 20px; box-shadow: 0 6px 20px rgb(16 24 40 / 6%); }
      h1 { margin: 0 0 .5rem; font-size: 1.6rem; letter-spacing: -.02em; }
      p { margin: .5rem 0; }
      .actions a { display: inline-block; margin: .75rem .5rem 0 0; padding: .6rem 1.1rem; border-radius: 12px; background: #15171c; color: #fff; text-decoration: none; font-weight: 600; }
      .actions a + a { background: transparent; color: #15171c; border: 1px solid #e3e5e9; }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div>
        <strong>Study room finder</strong>
        <nav aria-label="site">
          <a href="/">Find a room</a>
          <a href="/book/">Book a room</a>
          <a href="/bookings/">Your bookings</a>
        </nav>
      </div>
    </header>
    <main${options.reason ? ` data-reason="${escape(options.reason)}"` : ""}>
      <h1>${escape(options.title)}</h1>
      <p>${escape(options.message)}</p>
      <p class="actions">${options.actions}</p>
    </main>
  </body>
</html>`;
  return new Response(html, { status: options.status, headers: { "content-type": "text/html; charset=utf-8" } });
}
