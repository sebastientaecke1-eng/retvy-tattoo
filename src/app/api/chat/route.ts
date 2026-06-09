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
  estimatePrice,
  getArtistBySlug,
  matchArtists,
} from "@/lib/artists";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es un assistant spécialisé en tatouage pour la plateforme Retvy. Tu aides les clients à définir leur projet de tatouage en posant des questions précises et bienveillantes. Tu poses une seule question à la fois. Tu parles en français uniquement.

Questions initiales (une par une) :
1. Le style de tatouage (japonais, réalisme, minimaliste, géométrique, old school, blackwork, aquarelle, fine line, autre)
2. La zone du corps (avant-bras, bras, dos, jambe, etc.)
3. La taille approximative (petit < 5cm, moyen 5-15cm, grand > 15cm)
4. Le budget approximatif en euros
5. La ville
6. Image de référence (optionnel — l'utilisateur peut passer)

Matching et rayon de recherche :
- Dès que style, zone, taille, budget et ville sont connus, appelle submit_match SANS maxDistanceKm (recherche ville exacte uniquement).
- Si submit_match retourne needsTravelRadius: true, pose EXACTEMENT cette question (adapte [ville]) :
  "Je n'ai pas trouvé de tatoueur à [ville]. Jusqu'à combien de kilomètres êtes-vous prêt à vous déplacer ?"
  Propose des exemples : 20 km, 50 km, 100 km ou plus.
- Quand l'utilisateur indique sa distance, rappelle submit_match avec maxDistanceKm (nombre entier : 20, 50, 100, 150…).
- Interprétation : ≤20 km = même département ; ≤50 km = département + voisins ; ≥100 km = région élargie.

Après les résultats — conversation continue :
- Le chat RESTE OUVERT après l'affichage des résultats. Ne termine jamais la conversation.
- L'utilisateur peut affiner (style, budget, ville), demander plus de résultats (limit: 8), poser des questions sur un tatoueur listé dans le dernier submit_match.
- Pour toute modification de critères, rappelle submit_match avec les valeurs mises à jour.
- Réponds aux questions sur un tatoueur en t'appuyant UNIQUEMENT sur les données du dernier submit_match (nom, ville, styles, bio, lien /ink/[slug]). Ne jamais inventer d'informations.

Règles strictes :
- UNE question à la fois, sauf après les résultats où tu peux inviter à affiner.
- Réagis brièvement ("Joli choix.", "Compris.", "Parfait.").
- Ne cite JAMAIS de tatoueur hors submit_match. Ne donne JAMAIS de prix dans le texte (l'estimation est dans les résultats).
- Si needsTravelRadius est false et noArtistsFound est true (même avec rayon élargi), dis honnêtement qu'aucun professionnel Retvy ne correspond et invite à revenir plus tard.
- Si des résultats existent, tu peux écrire "Voici ce que j'ai trouvé pour toi ↓" puis rester disponible.
- Si une réponse est vague, propose 2-3 suggestions concrètes.`;

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response("OPENAI_API_KEY non configurée", { status: 503 });
  }

  const body = (await request.json()) as {
    messages?: UIMessage[];
    artistSlug?: string;
  };

  if (!Array.isArray(body.messages)) {
    return new Response("messages requis", { status: 400 });
  }

  const scopedArtist = body.artistSlug
    ? await getArtistBySlug(body.artistSlug)
    : null;

  const openai = createOpenAI({ apiKey: key });
  const model = openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");

  const tools = {
    submit_match: tool({
      description:
        "Recherche des tatoueurs Retvy en base. Appeler pour la recherche initiale (sans maxDistanceKm), après réponse sur la distance (avec maxDistanceKm), ou pour affiner / voir plus de résultats.",
      inputSchema: z.object({
        style: z.string(),
        bodyZone: z.string(),
        size: z.string(),
        budget: z.number(),
        city: z.string(),
        referenceNote: z.string().optional(),
        maxDistanceKm: z.number().min(0).max(500).optional(),
        limit: z.number().min(1).max(12).optional(),
      }),
      execute: async ({
        style,
        bodyZone,
        size,
        budget,
        city,
        referenceNote,
        maxDistanceKm,
        limit,
      }) => {
        const price = estimatePrice({ style, size, bodyZone });

        if (scopedArtist) {
          return {
            summary: {
              style,
              bodyZone,
              size,
              budget,
              city,
              referenceNote: referenceNote ?? null,
              maxDistanceKm: maxDistanceKm ?? null,
            },
            priceEstimate: price,
            artists: [scopedArtist],
            noArtistsFound: false,
            needsTravelRadius: false,
            searchScope: "city" as const,
          };
        }

        const { artists, searchScope, needsTravelRadius } = await matchArtists({
          style,
          city,
          budget,
          maxDistanceKm,
          limit: limit ?? 4,
        });

        return {
          summary: {
            style,
            bodyZone,
            size,
            budget,
            city,
            referenceNote: referenceNote ?? null,
            maxDistanceKm: maxDistanceKm ?? null,
          },
          priceEstimate: price,
          artists,
          noArtistsFound: artists.length === 0 && !needsTravelRadius,
          needsTravelRadius,
          searchScope,
        };
      },
    }),
  };

  const systemPrompt = scopedArtist
    ? `${SYSTEM_PROMPT}\n\nContexte : réservation avec ${scopedArtist.name} (${scopedArtist.studio}). Ne propose aucun autre tatoueur.`
    : SYSTEM_PROMPT;

  const result = streamText({
    model,
    system: systemPrompt,
    tools,
    stopWhen: stepCountIs(16),
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
  });
}
