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
  emptyProAvailabilityContext,
  loadProAvailabilityContext,
  proposeAvailableSlots,
} from "@/lib/pro/availability";
import {
  buildProjectDescription,
  parseSizeCategory,
  resolveBookingSlot,
} from "@/lib/pro/ink-booking";
import { computeProDepositEur } from "@/lib/pro/compute-deposit";
import { parseBudgetEuros } from "@/lib/pro/ink-booking";
import { styleLabel } from "@/lib/pro/public-profile";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimatePrice } from "@/lib/artists";

export const maxDuration = 60;

const OPENAI_TIMEOUT_MS = 55_000;

async function safeToolExecute<T>(
  toolName: string,
  fn: () => Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur inattendue dans l'outil";
    console.error(`[ink/chat] tool:${toolName}`, err);
    return { error: message };
  }
}

async function loadAvailabilitySafe(
  proUserId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  try {
    return await loadProAvailabilityContext(proUserId, rangeStart, rangeEnd);
  } catch (err) {
    console.error("[ink/chat] loadProAvailabilityContext", err);
    return emptyProAvailabilityContext(proUserId);
  }
}

function buildInkSystemPrompt(
  artistName: string,
  styles: string[],
  currentDateIso: string,
): string {
  const now = new Date(currentDateIso);
  const dateActuelle = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Paris",
  });
  const styleList = styles.map((s) => `- ${styleLabel(s)} (id: ${s})`).join("\n");
  return `Tu es l'assistant de réservation Retvy pour le tatoueur ${artistName}.
Tu guides le client en français, une seule question à la fois, ton bienveillant et concis.

Date et créneaux :
- La date d'aujourd'hui est ${dateActuelle} (référence ISO : ${currentDateIso}).
- Toutes les dates proposées doivent être dans le futur.
- Si le client dit « le 17 juin », propose le 17 juin ${now.getFullYear()} (ou l'année suivante si cette date est déjà passée).
- N'accepte jamais une date antérieure à aujourd'hui.

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
- Le budget est une information textuelle : ne déclenche aucun outil tant que les dates ne sont pas collectées.
- Si une date est bloquée (outil check_preferred_dates), dis qu'elle est indisponible.
- Si propose_available_slots retourne slots vides ou has_working_hours false, explique que le tatoueur n'a pas encore configuré ses disponibilités et propose d'autres dates.
- Respecte les horaires et créneaux retournés par les outils (ne invente pas de créneaux).
- Quand le client choisit un créneau parmi les 3 proposés, retiens date + heure exacte au format HH:MM (ex: 10:00, 14:30).
- Si le client dit « oui le 17 juin à 10h », enregistre slot_date=2026-06-17 et slot_time=10:00.
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
    console.error("[ink/chat] OPENAI_API_KEY manquante");
    return new Response("OPENAI_API_KEY non configurée", { status: 503 });
  }

  try {
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
        execute: async ({ dates }) =>
          safeToolExecute("check_preferred_dates", async () => {
            const ctx = await loadAvailabilitySafe(
              proUserId,
              rangeStart,
              rangeEnd,
            );
            const normalized = dates
              .map((d) => d.trim())
              .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
            const unparsed = dates
              .map((d) => d.trim())
              .filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d));
            const result = checkPreferredDates(normalized, ctx);
            return {
              ...result,
              unparsed_dates: [...result.unparsed_dates, ...unparsed],
            };
          }),
      }),
      propose_available_slots: tool({
        description:
          "Propose 3 créneaux disponibles selon style, taille et dates préférées.",
        inputSchema: z.object({
          style: z.string(),
          size: z.string(),
          preferred_dates: z.array(z.string()).optional(),
        }),
        execute: async ({ style, size, preferred_dates }) =>
          safeToolExecute("propose_available_slots", async () => {
            const sizeCategory = parseSizeCategory(size);
            const ctx = await loadAvailabilitySafe(
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
            return {
              slots,
              size_category: sizeCategory,
              has_working_hours: ctx.schedules.length > 0,
            };
          }),
      }),
      complete_booking_intake: tool({
        description:
          "Finalise le dossier quand toutes les infos et le créneau sont connus.",
        inputSchema: z.object({
          style: z.string(),
          zone: z.string(),
          size: z.string(),
          budget: z.preprocess(
            (val) => parseBudgetEuros(val) ?? val,
            z.coerce.number().int().min(1).max(50000),
          ),
          slot_date: z.string(),
          slot_time: z.string(),
          client_name: z.string(),
          client_email: z.string().email(),
          client_phone: z.string(),
          reference_note: z.string().optional(),
          reference_image_url: z.string().url().optional(),
        }),
        execute: async (input) =>
          safeToolExecute("complete_booking_intake", async () => {
            const size_category = parseSizeCategory(input.size);
            const ctx = await loadAvailabilitySafe(
              proUserId,
              rangeStart,
              rangeEnd,
            );
            const slots = proposeAvailableSlots({
              ctx,
              style: input.style,
              sizeCategory: size_category,
              preferredDates: [input.slot_date],
              count: 20,
              from: rangeStart,
            });
            const resolved = resolveBookingSlot({
              slot_date: input.slot_date,
              slot_time: input.slot_time,
              availableSlots: slots,
            });
            const duration_minutes =
              resolved.duration_minutes ?? slots[0]?.duration_minutes ?? 90;

            const price = estimatePrice({
              style: input.style,
              size: input.size,
              bodyZone: input.zone,
            });

            const admin = createAdminClient();
            const budgetEur =
              parseBudgetEuros(input.budget) ??
              Math.round(Number(input.budget));

            const [{ data: depositRow, error: depositError }, deposit_amount] =
              await Promise.all([
                admin
                  .from("pro_deposit_settings")
                  .select("deposit_type, cancellation_policy, rules")
                  .eq("user_id", proUserId)
                  .maybeSingle(),
                computeProDepositEur(admin, proUserId, budgetEur),
              ]);

            if (depositError) {
              console.error("[ink/chat] pro_deposit_settings", depositError.message);
            }

            return {
              artist_name: profile.artist_name,
              artist_slug: slug,
              style: input.style,
              zone: input.zone,
              size: input.size,
              size_category,
              budget: budgetEur,
              slot_date: resolved.slot_date,
              slot_time: resolved.slot_time,
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
                budget: budgetEur,
                reference_note: input.reference_note ?? null,
              }),
              price_estimate: price,
              deposit_amount,
              cancellation_policy: depositRow?.cancellation_policy ?? "48h",
              slot_available: resolved.matched,
            };
          }),
      }),
    };

    const currentDateIso = new Date().toISOString();
    const modelMessages = await convertToModelMessages(body.messages);

    const result = streamText({
      model,
      system: buildInkSystemPrompt(
        profile.artist_name,
        styles,
        currentDateIso,
      ),
      tools,
      stopWhen: stepCountIs(12),
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 2,
      messages: modelMessages,
      onError: ({ error }) => {
        console.error("[ink/chat] streamText", error);
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: body.messages,
      onError: (error) => {
        console.error("[ink/chat] stream response", error);
        return error instanceof Error
          ? error.message
          : "Une erreur est survenue";
      },
    });
  } catch (err) {
    console.error("[ink/chat] POST", err);
    const message =
      err instanceof Error ? err.message : "Erreur serveur";
    return new Response(message, { status: 500 });
  }
}
