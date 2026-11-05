/**
 * route.ts — /api/ink/[slug]/chat
 * ---------------------------------
 * Chatbot de réservation alimenté par OpenAI (Vercel AI SDK).
 *
 * Fonctionnement général :
 *   1. Charge le profil public du tatoueur via son slug.
 *   2. Interroge ses styles actifs (pro_styles + catalogue) pour personnaliser le prompt.
 *   3. Expose 4 outils à l'IA :
 *      - check_preferred_dates    : vérifie les disponibilités pour des dates données
 *      - propose_available_slots  : propose 3 créneaux selon style/taille/préférences
 *      - get_day_slots            : liste tous les créneaux d'une journée précise
 *      - complete_booking_intake  : finalise le dossier client avec estimation du prix
 *   4. Retourne un stream de réponse UI (useChat-compatible).
 *
 * L'IA guide le client étape par étape (style → zone → taille → couleur →
 * image de référence → budget → dates → créneau → coordonnées) et appelle
 * `complete_booking_intake` une fois toutes les informations collectées.
 *
 * Variables d'environnement requises :
 *   - OPENAI_API_KEY   : clé API OpenAI
 *   - OPENAI_MODEL     : modèle à utiliser pour les conversations sans image (défaut : gpt-4o-mini)
 *     → Si le client envoie une image, le modèle bascule automatiquement sur gpt-4o (vision).
 */

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
  getDurationMinutes,
  loadProAvailabilityContext,
  proposeAvailableSlots,
  slotsForDay,
} from "@/lib/pro/availability";
import {
  buildProjectDescription,
  parseSizeCategory,
  resolveBookingSlot,
} from "@/lib/pro/ink-booking";
import { computeProDepositEur } from "@/lib/pro/compute-deposit";
import { parseBudgetEuros } from "@/lib/pro/ink-booking";
import { fetchProStyleOptions } from "@/lib/pro/tattoo-style-catalog";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimatePrice } from "@/lib/artists";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Durée maximale de la route Vercel/Cloudflare (en secondes). */
export const maxDuration = 60;

/** Timeout OpenAI légèrement inférieur à maxDuration pour éviter les coupures brutales. */
const OPENAI_TIMEOUT_MS = 55_000;

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

/**
 * Enveloppe l'exécution d'un outil dans un try/catch.
 * En cas d'erreur, retourne un objet `{ error }` plutôt que de planter le stream.
 */
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

/**
 * Charge le contexte de disponibilité du tatoueur sans faire crasher la route.
 * Retourne un contexte vide (pas de créneaux) en cas d'erreur Supabase.
 */
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

/**
 * Détecte si le client a joint une image dans son historique de messages.
 * Si oui, on passe sur gpt-4o (vision) au lieu de gpt-4o-mini.
 */
function uiMessagesHaveImages(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    message.parts?.some(
      (part) =>
        part.type === "file" &&
        "mediaType" in part &&
        typeof part.mediaType === "string" &&
        part.mediaType.startsWith("image/"),
    ),
  );
}

// ---------------------------------------------------------------------------
// Prompt système
// ---------------------------------------------------------------------------

/**
 * Construit le prompt système injecté dans chaque requête OpenAI.
 *
 * Le prompt :
 *   - Identifie l'IA comme l'assistant du tatoueur `artistName`
 *   - Liste les styles proposés par ce tatoueur (issus de pro_styles + catalogue)
 *   - Définit l'ordre strict des questions (style → … → téléphone)
 *   - Adapte les instructions si le client a déjà envoyé une image de référence
 *
 * @param artistName       - Nom affiché du tatoueur
 * @param styles           - Styles actifs du tatoueur {slug, label}
 * @param currentDateIso   - Date ISO actuelle (pour calculer les dates futures)
 * @param hasReferenceImage - Le client a-t-il joint une image dans le chat ?
 */
function buildInkSystemPrompt(
  artistName: string,
  styles: Array<{ slug: string; label: string }>,
  currentDateIso: string,
  hasReferenceImage: boolean,
): string {
  const now = new Date(currentDateIso);
  const dateActuelle = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Paris",
  });
  const styleList = styles.map((s) => `- ${s.label} (id: ${s.slug})`).join("\n");

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
2. Zone du corps — tu DOIS OBLIGATOIREMENT appeler l'outil show_body_selector immédiatement après avoir reçu le style. Ne jamais demander la zone par texte, ne jamais écrire le nom du mannequin dans le message : appelle directement l'outil avec un message d'intro très court (ex: "Sélectionnez la zone sur ce mannequin :"). Genre male par défaut.
3. Taille approximative (petit <10cm, moyen 10-25cm, grand 25cm+)
4. Description du projet / Flash choisi :
   A) Si le style est Flash :
      - Demande : « Quel flash vous intéresse ? Envoyez-moi une photo ou un screenshot du design que vous avez vu dans le portfolio du tatoueur. »
      - Dès que le client envoie une image : analyse-la, confirme le design (ex : « Super, je vois que vous souhaitez ce flash [description]. C'est bien ça ? »), enregistre dans reference_note.
      - Si le client dit qu'il n'a pas encore choisi : dis-lui de regarder le portfolio du tatoueur et de revenir quand il aura choisi.
      - Passe ensuite directement à l'étape 7 (budget) — pas besoin de demander la couleur ni une image supplémentaire (le design est déjà défini).
   B) Sinon (style classique) :
      - Demande : « Avez-vous une idée de ce que vous souhaitez représenter ? Même vague, ça m'aide à préparer le tatoueur. »
      - Si le client décrit quelque chose : enregistre tel quel dans reference_note.
      - Si hésitant : enregistre avec " (à confirmer lors des croquis)" dans reference_note.
      - Si "non" ou "pas d'idée" : passe à la suite, reference_note sera null.
5. Couleur (uniquement si style NON Flash) — demande exactement : « Souhaitez-vous un tatouage en couleur, en noir et gris, ou vous n'avez pas encore décidé ? »
   Enregistre color_preference : "color" | "black_and_grey" | "undecided"
   Pour un Flash : color_preference = "undecided" (défini par le design).
6. Image de référence (uniquement si style NON Flash, optionnel — le client peut dire "non" ou "passer")
7. Estimation de prix — NE demande PAS le budget au client.
   - Appelle get_price_estimate dès que tu as style + taille + color_preference. Passe aussi la zone du corps si elle est connue (multiplicateur de zone appliqué).
   - Annonce le tarif au client : « Pour ce tatouage, il faudra compter entre X et Y€. Ça vous convient ? »
   - Si le client dit oui ou ne conteste pas : poursuis normalement.
   - Si le client dit que c'est trop cher : sois compréhensif, propose d'ajuster la taille si pertinent (ex : passer en petit), puis relance l'estimation. Si aucune solution, laisse-le continuer ou non à sa discrétion.
   - Ne demande jamais « quel est votre budget ? ».
8. Dates souhaitées (une ou plusieurs) — utilise l'outil check_preferred_dates
9. Préférence horaire — demande exactement : « Préférez-vous un rendez-vous le matin ou l'après-midi ? »
   Enregistre time_preference : "morning" | "afternoon" | "any" (si indifférent)
10. Propose 3 créneaux via propose_available_slots (style + taille + time_preference requis)
    - Si aucun créneau dans la plage préférée, l'outil retourne automatiquement le créneau le plus tôt disponible
    - Dans ce cas, informe le client : « Aucun créneau disponible le [matin/après-midi] pour cette date. Le plus tôt disponible est X. »
11. Prénom et nom du client
12. Email
13. Téléphone

${hasReferenceImage
  ? `Photo de référence :
- Le client a déjà uploadé une image de référence (visible dans le chat).
- Analyse-la visuellement : style probable, zone suggérée, couleur/N&B, éléments clés.
- Pose des questions en lien avec ce que tu vois, sans répéter inutilement les questions déjà couvertes.
- Intègre tes observations dans reference_note lors de complete_booking_intake.`
  : `Photo de référence :
- Le client peut ajouter une photo à tout moment via le bouton dédié.
- Si une image arrive plus tard, analyse-la et adapte tes questions.`}

Règles :
- UNE question à la fois. Réagis brièvement à chaque réponse.
- Appelle get_price_estimate dès que style + taille + color_preference sont connus (étape 7), avant de demander les dates.
- Si une date est bloquée (outil check_preferred_dates), dis qu'elle est indisponible.
- Si propose_available_slots retourne slots vides ou has_working_hours false, explique que le tatoueur n'a pas encore configuré ses disponibilités et propose d'autres dates.
- Respecte les horaires et créneaux retournés par les outils (ne invente pas de créneaux).
- Quand le client choisit un créneau parmi les 3 proposés, retiens date + heure exacte au format HH:MM (ex: 10:00, 14:30).
- Si le client dit « oui le 17 juin à 10h », enregistre slot_date=2026-06-17 et slot_time=10:00.
- Si le client demande une heure précise différente des 3 créneaux proposés (ex: "à 16h", "vers 14h"), utilise get_day_slots avec la date choisie pour voir TOUS les créneaux disponibles ce jour-là, puis confirme si cette heure est dispo ou propose les alternatives les plus proches.
- Si le client a envoyé une image dans le chat, repasse son URL dans reference_image_url lors de complete_booking_intake.
- Quand tu as TOUT (style, zone, taille, color_preference, créneau, nom, email, téléphone), appelle complete_booking_intake. Pour le champ budget, passe l'estimation retournée par get_price_estimate (format "X-Y€" ou la valeur min).
- Après complete_booking_intake, écris uniquement : "Parfait ! Voici le récapitulatif de votre réservation ↓"
- Ne mentionne pas Stripe ni les détails techniques.`;
}

// ---------------------------------------------------------------------------
// Route POST
// ---------------------------------------------------------------------------

/**
 * Handler POST — traite un tour de conversation du chatbot de réservation.
 *
 * Corps attendu : `{ messages: UIMessage[] }` (format Vercel AI SDK useChat).
 * Retourne un stream `UIMessageStreamResponse` consommé côté client par useChat.
 *
 * @param request - Requête HTTP entrante
 * @param params  - Paramètre de route : `slug` du tatoueur (ex: "jean-dupont")
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Rate limit : 20 messages / min par IP (protège les crédits OpenAI)
  const ip = getClientIp(request);
  const rl = checkRateLimit(`chat:${ip}`, { limit: 20, windowSecs: 60 });
  if (!rl.ok) return rateLimitResponse(rl);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("[ink/chat] OPENAI_API_KEY manquante");
    return new Response("OPENAI_API_KEY non configurée", { status: 503 });
  }

  try {
    const { slug } = await params;

    // --- 1. Profil du tatoueur ---
    const profile = await fetchPublicProProfileBySlug(slug);
    if (!profile?.user_id || !profile.artist_name) {
      return new Response("Profil introuvable", { status: 404 });
    }

    // --- 2. Corps de la requête ---
    const body = (await request.json()) as { messages?: UIMessage[]; referenceImageUrl?: string };
    console.log("[ink/chat] referenceImageUrl reçu:", body.referenceImageUrl ?? "AUCUN");
    if (!Array.isArray(body.messages)) {
      return new Response("messages requis", { status: 400 });
    }

    const admin = createAdminClient();
    const proProfileId = profile.id ?? "";
    const proUserId    = profile.user_id;

    // --- 3. Styles actifs du tatoueur (pour le prompt) ---
    const proStyleOptions = proProfileId
      ? await fetchProStyleOptions(admin, proProfileId)
      : [];

    // Fenêtre de disponibilité : aujourd'hui + 60 jours
    const rangeStart = new Date();
    const rangeEnd   = new Date(rangeStart.getTime() + 60 * 24 * 60 * 60 * 1000);

    // --- 4. Modèle OpenAI ---
    const openai = createOpenAI({ apiKey: key });
    const hasReferenceImage = uiMessagesHaveImages(body.messages) || !!body.referenceImageUrl;
    // gpt-4o si une image est présente (vision requise), sinon gpt-4o-mini ou variable d'env
    const model = openai(
      hasReferenceImage
        ? "gpt-4o"
        : (process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    );

    // --- 5. Outils IA ---
    const tools = {
      /**
       * Vérifie si des dates souhaitées par le client sont disponibles.
       * Retourne pour chaque date : available (bool) + reason si bloquée.
       */
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
            const ctx = await loadAvailabilitySafe(proUserId, rangeStart, rangeEnd);
            const normalized = dates.map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
            const unparsed   = dates.map((d) => d.trim()).filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d));
            const result = checkPreferredDates(normalized, ctx);
            return { ...result, unparsed_dates: [...result.unparsed_dates, ...unparsed] };
          }),
      }),

      /**
       * Propose 3 créneaux disponibles adaptés au style et à la taille du projet.
       * Tient compte des dates préférées du client si fournies.
       */
      propose_available_slots: tool({
        description:
          "Propose 3 créneaux disponibles selon style, taille et dates préférées.",
        inputSchema: z.object({
          style: z.string(),
          size: z.string(),
          preferred_dates: z.array(z.string()).optional(),
          time_preference: z.enum(["morning", "afternoon", "any"]).optional(),
        }),
        execute: async ({ style, size, preferred_dates, time_preference }) =>
          safeToolExecute("propose_available_slots", async () => {
            const sizeCategory = parseSizeCategory(size);
            const ctx = await loadAvailabilitySafe(proUserId, rangeStart, rangeEnd);
            const pref = time_preference === "morning" || time_preference === "afternoon"
              ? time_preference
              : undefined;
            const slots = proposeAvailableSlots({
              ctx,
              style,
              sizeCategory,
              preferredDates: preferred_dates,
              count: 3,
              from: rangeStart,
              timePreference: pref,
            });
            return { slots, size_category: sizeCategory, has_working_hours: ctx.schedules.length > 0 };
          }),
      }),

      /**
       * Retourne TOUS les créneaux disponibles pour une journée précise.
       * Utile quand le client demande une heure spécifique hors des 3 créneaux proposés.
       */
      get_day_slots: tool({
        description:
          "Retourne TOUS les créneaux disponibles pour une date précise. À utiliser quand le client demande une heure spécifique non proposée parmi les 3 créneaux initiaux.",
        inputSchema: z.object({
          date: z.string().describe("Date ISO YYYY-MM-DD"),
          style: z.string(),
          size: z.string(),
        }),
        execute: async ({ date, style, size }) =>
          safeToolExecute("get_day_slots", async () => {
            const sizeCategory = parseSizeCategory(size);
            const ctx = await loadAvailabilitySafe(proUserId, rangeStart, rangeEnd);
            const dayDate = new Date(`${date}T12:00:00`);
            const duration = getDurationMinutes(ctx, style, sizeCategory);
            const allSlots = slotsForDay(dayDate, ctx, duration);
            return { date, available_times: allSlots, has_working_hours: ctx.schedules.length > 0, total: allSlots.length };
          }),
      }),

      /**
       * Estime le prix en temps réel à partir des tarifs configurés par le pro.
       * À appeler juste après avoir collecté le budget du client (étape 7),
       * pour comparer et avertir si le budget est en dessous de la fourchette.
       */
      get_price_estimate: tool({
        description:
          "Calcule une estimation de prix (min/max en €) selon style, taille, zone du corps et couleur, en utilisant les vrais tarifs du tatoueur (multiplicateurs de zone inclus). Passe toujours la zone si elle est connue.",
        inputSchema: z.object({
          style: z.string(),
          size: z.string(),
          zone: z.string().optional().describe("Zone du corps sélectionnée (ex: Avant-bras, Dos, Cheville…)"),
          color_preference: z.enum(["color", "black_and_grey", "undecided"]),
        }),
        execute: async ({ style, size, zone, color_preference }) =>
          safeToolExecute("get_price_estimate", async () => {
            const admin = createAdminClient();
            const { data: pricingRow } = await admin
              .from("pro_pricing_settings")
              .select("*")
              .eq("user_id", proUserId)
              .maybeSingle();
            const estimate = estimatePrice(
              { style, size, bodyZone: zone },
              pricingRow ?? null,
              color_preference,
            );
            return { min: estimate.min, max: estimate.max };
          }),
      }),


      /**
       * Affiche le sélecteur 3D interactif de zone corporelle côté client.
       * À appeler UNIQUEMENT à l'étape 2 (zone du corps) pour laisser le client
       * choisir visuellement son emplacement sur le mannequin 3D.
       */
      show_body_selector: tool({
        description:
          "Affiche le sélecteur 3D interactif du corps humain pour que le client choisisse la zone de son tatouage. À appeler à l'étape 2 (zone du corps) AVANT de demander verbalement la zone.",
        inputSchema: z.object({
          message: z.string().describe("Courte phrase d'introduction avant le sélecteur (ex: 'Veuillez sélectionner la zone sur ce mannequin 3D :')"),
          gender: z.enum(["male", "female"]).optional().describe("Sexe du mannequin (défaut: male)"),
        }),
        execute: async ({ message, gender = "male" }) => ({
          selector_shown: true,
          message,
          gender,
        }),
      }),

            /**
       * Finalise le dossier client une fois toutes les informations collectées.
       *
       * Actions réalisées :
       *   - Résout le créneau exact (vérifie qu'il est toujours disponible)
       *   - Calcule l'acompte via computeProDepositEur
       *   - Estime le prix avec les tarifs réels du pro (pro_pricing_settings)
       *   - Retourne le récapitulatif complet affiché dans la BookingCard côté client
       */
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
          color_preference: z.enum(["color", "black_and_grey", "undecided"]),
          reference_note: z.string().optional(),
          reference_image_url: z.string().url().optional(),
        }),
        execute: async (input) =>
          safeToolExecute("complete_booking_intake", async () => {
            const size_category = parseSizeCategory(input.size);
            const ctx = await loadAvailabilitySafe(proUserId, rangeStart, rangeEnd);

            // Résoudre le créneau (vérification de disponibilité)
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

            const admin = createAdminClient();
            const budgetEur =
              parseBudgetEuros(input.budget) ?? Math.round(Number(input.budget));

            // Données financières : acompte + tarifs pro (en parallèle pour la performance)
            const [
              { data: depositRow, error: depositError },
              deposit_amount,
              { data: pricingRow },
            ] = await Promise.all([
              admin
                .from("pro_deposit_settings")
                .select("deposit_type, cancellation_policy, rules")
                .eq("user_id", proUserId)
                .maybeSingle(),
              computeProDepositEur(admin, proUserId, budgetEur),
              admin
                .from("pro_pricing_settings")
                .select("*")
                .eq("user_id", proUserId)
                .maybeSingle(),
            ]);

            // Estimation du prix avec les vrais tarifs du pro (ou fallback générique)
            const price = estimatePrice(
              { style: input.style, size: input.size, bodyZone: input.zone },
              pricingRow ?? null,
              input.color_preference,
            );

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
              color_preference: input.color_preference,
              reference_note: input.reference_note ?? null,
              reference_image_url: input.reference_image_url ?? null,
              project_description: buildProjectDescription({
                style: input.style,
                zone: input.zone,
                size: input.size,
                budget: budgetEur,
                color_preference: input.color_preference,
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

    // --- 6. Appel streamText ---
    const currentDateIso  = new Date().toISOString();
    const modelMessages   = await convertToModelMessages(body.messages);

    // Si une image de référence est passée via le body, l'injecter dans le dernier message utilisateur
    if (body.referenceImageUrl) {
      const lastUserIdx = modelMessages.findLastIndex((m) => m.role === "user");
      if (lastUserIdx !== -1) {
        const lastUser = modelMessages[lastUserIdx];
        const textParts: Array<{ type: "text"; text: string }> =
          typeof lastUser.content === "string"
            ? [{ type: "text" as const, text: lastUser.content }]
            : (lastUser.content as Array<{ type: string; text?: string }>)
                .filter((p) => p.type === "text")
                .map((p) => ({ type: "text" as const, text: p.text ?? "" }));
        // Utiliser { type: "file", data: URL, mediaType } pour que le SDK passe l'URL
        // directement à OpenAI (isUrlSupportedByModel=true) sans téléchargement intermédiaire.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (modelMessages as any)[lastUserIdx] = {
          role: "user",
          content: [
            {
              type: "file",
              data: new URL(body.referenceImageUrl),
              mediaType: "image/jpeg",
            },
            ...textParts,
          ],
        };
      }
    }

    const result = streamText({
      model,
      system: buildInkSystemPrompt(
        profile.artist_name,
        proStyleOptions,
        currentDateIso,
        hasReferenceImage,
      ),
      tools,
      stopWhen: stepCountIs(14),   // max 14 appels d'outils par tour (étape préférence horaire ajoutée)
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
        return error instanceof Error ? error.message : "Une erreur est survenue";
      },
    });
  } catch (err) {
    console.error("[ink/chat] POST", err);
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return new Response(message, { status: 500 });
  }
}
