import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOOKING_TIMEZONE = "Europe/Paris";

type BookingRow = {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string | null;
  booking_date: string;
  project_description: string | null;
  style: string | null;
  zone: string | null;
  reminder_3d_sent_at: string | null;
  reminder_1d_sent_at: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parisDayKey(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function addDaysToDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatBookingDateTimeParis(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: BOOKING_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso)) + " (heure de Paris)";
}

function escapeHtml(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

async function sendBrevoEmail(params: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY")?.trim();
  if (!apiKey) return { ok: false, error: "missing_api_key" };

  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL")?.trim() ?? "contact.tattoo@retvy.fr";
  const senderName = Deno.env.get("BREVO_SENDER_NAME")?.trim() ?? "Retvy";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      ...params,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[send-booking-reminders] brevo", res.status, body);
    return { ok: false, error: `http_${res.status}` };
  }

  return { ok: true };
}

function reminderHtml(data: {
  clientName: string;
  artistName: string;
  studioAddress: string;
  dateTimeParis: string;
  projectSummary: string;
  daysUntil: number;
}): string {
  const when = data.daysUntil === 1 ? "demain" : `dans ${data.daysUntil} jours`;
  return `<!doctype html><html lang="fr"><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa;padding:24px">
<h1 style="color:#f59e0b">Rappel de rendez-vous</h1>
<p>Bonjour ${escapeHtml(data.clientName)},</p>
<p>Ton rendez-vous chez <strong>${escapeHtml(data.artistName)}</strong> est prévu ${when}.</p>
<ul>
<li><strong>Date & heure :</strong> ${escapeHtml(data.dateTimeParis)}</li>
<li><strong>Adresse :</strong> ${escapeHtml(data.studioAddress)}</li>
<li><strong>Projet :</strong> ${escapeHtml(data.projectSummary)}</li>
</ul>
<p style="color:#a1a1aa">— L'équipe Retvy</p>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return jsonResponse({ error: "Non autorisé" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration Supabase incomplète" }, 503);
  }

  if (!Deno.env.get("BREVO_API_KEY")?.trim()) {
    return jsonResponse({ error: "BREVO_API_KEY manquant" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const todayParis = parisDayKey(new Date().toISOString());
  const target3d = addDaysToDayKey(todayParis, 3);
  const target1d = addDaysToDayKey(todayParis, 1);

  const rangeStart = new Date();
  const rangeEnd = new Date();
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 5);

  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, user_id, client_name, client_email, booking_date, project_description, style, zone, reminder_3d_sent_at, reminder_1d_sent_at",
    )
    .neq("status", "cancelled")
    .not("client_email", "is", null)
    .gte("booking_date", rangeStart.toISOString())
    .lte("booking_date", rangeEnd.toISOString());

  if (error) {
    console.error("[send-booking-reminders] query", error);
    return jsonResponse({ error: error.message }, 500);
  }

  let sent3d = 0;
  let sent1d = 0;

  for (const row of (bookings ?? []) as BookingRow[]) {
    if (!row.client_email) continue;

    const dayKey = parisDayKey(row.booking_date);
    let daysUntil: 1 | 3 | null = null;
    let sentColumn: "reminder_3d_sent_at" | "reminder_1d_sent_at" | null = null;

    if (dayKey === target3d && !row.reminder_3d_sent_at) {
      daysUntil = 3;
      sentColumn = "reminder_3d_sent_at";
    } else if (dayKey === target1d && !row.reminder_1d_sent_at) {
      daysUntil = 1;
      sentColumn = "reminder_1d_sent_at";
    }

    if (!daysUntil || !sentColumn) continue;

    const { data: pro } = await admin
      .from("pro_profiles")
      .select("artist_name, studio, address, city, postal_code")
      .eq("user_id", row.user_id)
      .maybeSingle();

    const studioAddress = [
      pro?.studio,
      pro?.address,
      pro?.postal_code,
      pro?.city,
    ]
      .filter(Boolean)
      .join(", ");

    const dateTimeParis = formatBookingDateTimeParis(row.booking_date);
    const artistName = pro?.artist_name ?? "votre tatoueur";
    const when = daysUntil === 1 ? "demain" : `dans ${daysUntil} jours`;

    const brevoResult = await sendBrevoEmail({
      to: [{ email: row.client_email, name: row.client_name }],
      subject: `Rappel RDV ${when} — ${artistName}`,
      htmlContent: reminderHtml({
        clientName: row.client_name,
        artistName,
        studioAddress,
        dateTimeParis,
        projectSummary: row.project_description ?? "",
        daysUntil,
      }),
      textContent: `Rappel : RDV ${dateTimeParis} chez ${artistName}`,
      tags: [`booking-reminder-j${daysUntil}`],
    });

    if (!brevoResult.ok) continue;

    await admin
      .from("bookings")
      .update({ [sentColumn]: new Date().toISOString() })
      .eq("id", row.id);

    if (daysUntil === 3) sent3d++;
    else sent1d++;
  }

  console.log("[send-booking-reminders] done", {
    todayParis,
    target3d,
    target1d,
    sent3d,
    sent1d,
  });

  return jsonResponse({ ok: true, sent3d, sent1d });
});
