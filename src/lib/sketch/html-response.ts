function escapeHtml(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)} — Retvy</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
      background:#0a0a0a; color:#fafafa; font-family:system-ui,sans-serif; padding:24px; }
    .card { max-width:480px; width:100%; background:#18181b; border:1px solid #3f3f46;
      border-radius:16px; padding:32px; }
    h1 { margin:0 0 12px; font-size:22px; }
    p { margin:0 0 16px; color:#d4d4d8; line-height:1.6; }
    label { display:block; margin-bottom:8px; font-size:14px; color:#a1a1aa; }
    textarea { width:100%; min-height:120px; border-radius:10px; border:1px solid #52525b;
      background:#09090b; color:#fafafa; padding:12px; font:inherit; box-sizing:border-box; }
    button { margin-top:16px; background:#f59e0b; color:#000; border:none; border-radius:10px;
      padding:12px 20px; font-weight:600; cursor:pointer; }
    .brand { color:#f59e0b; font-size:13px; font-weight:600; margin-bottom:8px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">Retvy</p>
    ${body}
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export function sketchSuccessPage(title: string, message: string): Response {
  return page(
    title,
    `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`,
  );
}

export function sketchErrorPage(title: string, message: string): Response {
  return page(
    title,
    `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`,
    400,
  );
}

export function sketchRevisionFormPage(token: string): Response {
  return page(
    "Demander une modification",
    `<h1>Demander une modification</h1>
     <p>Décrivez les changements souhaités sur le croquis.</p>
     <form method="post" action="/api/sketch/${escapeHtml(token)}/revision">
       <label for="comment">Votre message</label>
       <textarea id="comment" name="comment" required placeholder="Ex. Agrandir un peu la fleur, adoucir les ombres…"></textarea>
       <button type="submit">Envoyer ma demande</button>
     </form>`,
  );
}
