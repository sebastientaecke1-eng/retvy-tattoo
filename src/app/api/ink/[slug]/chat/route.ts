import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  checkPreferredDates,
  loadProAvailabilityContext,
  proposeAvailableSlots,
} from "@/lib/pro/availability";
import {
  buildProjectDescription,
  parseSizeCategory,
} from "@/lib/pro/ink-booking";
import { computeDepositFromSettings } from "@/lib/pro/compute-deposit";
import { parseRulesFromDb } from "@/lib/pro/deposit-settings";
import { styleLabel } from "@/lib/pro/public-profile";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimatePrice } from "@/lib/artists";

export const maxDuration = 60;

function buildInkSystemPrompt(artistName: string, styles: string[]): string {
  const styleList = styles.map((s) => `- ${styleLabel(s)} (id: ${s})`).join("\n");
  return `Tu es l'assistant de réservation Retvy pour le tatoueur ${artistName}.
Tu guides le client en français, une seule question à la fois, ton bienveillant et concis.

Ordre strict des questions :
1. Style de tatouage — propose uniquement ces styles du tatoueur :
${styleList}
2. Zone du corps
3. Taille approximative (petit <10cm, moyen 10-25cm, grand 25cm+)
4. Image de référence (optionnel — le client peut dire "non" ou "passer")
5. Budget approximatif en euros
6. Dates souhaitées (une ou plusieurs) — utilise l'outil check_preferred_dates
7. Propose 3 créneaux via propose_available_slots (style + taille requis)
8. Prénom et nom du client
9. Email
10. Téléphone

Règles :
- UNE question à la fois. Réagis brièvement à chaque réponse.
- Si une date est bloquée (outil check_preferred_dates), dis qu'elle est indisponible.
- Respecte les horaires et créneaux retournés par les outils (ne invente pas de créneaux).
- Quand le client choisit un créneau parmi les 3 proposés, retiens date + heure.
- Quand tu as TOUT (style, zone, taille, budget, créneau, nom, email, téléphone), appelle complete_booking_intake.
- Après complete_booking_intake, écris uniquement : "Parfait ! Voici le récapitulatif de votre réservation ↓"
- Ne mentionne pas Stripe ni les détails techniques.`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response("OPENAI_API_KEY non configurée", { status: 503 });
  }

  const { slug } = await params;
  const profile = await fetchPublicProProfileBySlug(slug);
  if (!profile?.user_id || !profile.artist_name) {
    return new Response("Profil introuvable", { status: 404 });
  }

  const body = (await request.json()) as { messages?: UIMessage[] };
  if (!Array.isArray(body.messages)) {
    return new Response("messages requis", { status: 400 });
  }

  const styles = profile.styles ?? [];
  const proUserId = profile.user_id;
  const rangeStart = new Date();
  const rangeEnd = new Date(rangeStart.getTime() + 60 * 24 * 60 * 60 * 1000);

  const openai = createOpenAI({ apiKey: key });
  const model = openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");

  const tools = {
    check_preferred_dates: tool({
      description:
        "Vérifie si des dates souhaitées sont bloquées ou sans horaire de travail.",
      inputSchema: z.object({
        dates: z.array(z.string()).min(1).max(14),
        style: z.string().optional(),
        size: z.string().optional(),
      }),
      execute: async ({ dates }) => {
        const ctx = await loadProAvailabilityContext(
          proUserId,
          rangeStart,
          rangeEnd,
        );
        const normalized = dates
          .map((d) => d.trim())
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
        return checkPreferredDates(normalized, ctx);
      },
    }),
    propose_available_slots: tool({
      description:
        "Propose 3 créneaux disponibles selon style, taille et dates préférées.",
      inputSchema: z.object({
        style: z.string(),
        size: z.string(),
        preferred_dates: z.array(z.string()).optional(),
      }),
      execute: async ({ style, size, preferred_dates }) => {
        const sizeCategory = parseSizeCategory(size);
        const ctx = await loadProAvailabilityContext(
          proUserId,
          rangeStart,
          rangeEnd,
        );
        const slots = proposeAvailableSlots({
          ctx,
          style,
          sizeCategory,
          preferredDates: preferred_dates,
          count: 3,
          from: rangeStart,
        });
        return { slots, size_category: sizeCategory };
      },
    }),
    complete_booking_intake: tool({
      description:
        "Finalise le dossier quand toutes les infos et le créneau sont connus.",
      inputSchema: z.object({
        style: z.string(),
        zone: z.string(),
        size: z.string(),
        budget: z.number(),
        slot_date: z.string(),
        slot_time: z.string(),
        client_name: z.string(),
        client_email: z.string().email(),
        client_phone: z.string(),
        reference_note: z.string().optional(),
        reference_image_url: z.string().url().optional(),
      }),
      execute: async (input) => {
        const size_category = parseSizeCategory(input.size);
        const ctx = await loadProAvailabilityContext(
          proUserId,
          rangeStart,
          rangeEnd,
        );
        const slots = proposeAvailableSlots({
          ctx,
          style: input.style,
          sizeCategory: size_category,
          preferredDates: [input.slot_date],
          count: 1,
          from: rangeStart,
        });
        const matched = slots.find(
          (s) =>
            s.date === input.slot_date &&
            s.time.slice(0, 5) === input.slot_time.slice(0, 5),
        );
        const duration_minutes = matched?.duration_minutes ?? slots[0]?.duration_minutes ?? 90;

        const price = estimatePrice({
          style: input.style,
          size: input.size,
          bodyZone: input.zone,
        });

        const admin = createAdminClient();
        const { data: depositRow } = await admin
          .from("pro_deposit_settings")
          .select("deposit_type, cancellation_policy, rules")
          .eq("user_id", proUserId)
          .maybeSingle();

        const depositSettings = depositRow
          ? {
              deposit_type: depositRow.deposit_type,
              rules: parseRulesFromDb(depositRow.rules),
            }
          : undefined;

        const deposit_amount = computeDepositFromSettings(
          price.min,
          depositSettings,
        );

        const intake = {
          artist_name: profile.artist_name,
          artist_slug: slug,
          style: input.style,
          zone: input.zone,
          size: input.size,
          size_category,
          budget: input.budget,
          slot_date: input.slot_date,
          slot_time: input.slot_time.slice(0, 5),
          duration_minutes,
          client_name: input.client_name,
          client_email: input.client_email,
          client_phone: input.client_phone,
          reference_note: input.reference_note ?? null,
          reference_image_url: input.reference_image_url ?? null,
          project_description: buildProjectDescription({
            style: input.style,
            zone: input.zone,
            size: input.size,
            budget: input.budget,
            reference_note: input.reference_note ?? null,
          }),
          price_estimate: price,
          deposit_amount,
          cancellation_policy: depositRow?.cancellation_policy ?? "48h",
          slot_available: !!matched,
        };

        return intake;
      },
    }),
  };

  const result = streamText({
    model,
    system: buildInkSystemPrompt(profile.artist_name, styles),
    tools,
    stopWhen: stepCountIs(12),
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
  });
}
