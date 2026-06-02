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

Questions à poser dans cet ordre, une par une :
1. Le style de tatouage (japonais, réalisme, minimaliste, géométrique, old school, blackwork, aquarelle, fine line, autre)
2. La zone du corps (avant-bras, bras, dos, jambe, etc.)
3. La taille approximative (petit < 5cm, moyen 5-15cm, grand > 15cm)
4. Le budget approximatif en euros
5. La ville
6. Propose une image de référence (optionnel — l'utilisateur peut passer)

Règles strictes :
- UNE question à la fois, jamais plusieurs.
- Réagis brièvement à la réponse précédente ("Joli choix.", "Compris.", "Parfait.").
- Ne propose JAMAIS de tatoueur dans le texte et ne donne JAMAIS de prix dans le texte.
- Dès que tu as les 5 infos obligatoires (style, zone, taille, budget, ville), appelle immédiatement l'outil "submit_match".
- Après l'appel à l'outil, écris UNIQUEMENT : "Voici ce que j'ai trouvé pour toi ↓"
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
        "Soumets le projet qualifié pour estimation et matching d'artistes. À appeler dès que style, zone, taille, budget et ville sont connus.",
      inputSchema: z.object({
        style: z.string(),
        bodyZone: z.string(),
        size: z.string(),
        budget: z.number(),
        city: z.string(),
        referenceNote: z.string().optional(),
      }),
      execute: async ({ style, bodyZone, size, budget, city, referenceNote }) => {
        const price = estimatePrice({ style, size, bodyZone });
        const artists = scopedArtist
          ? [scopedArtist]
          : await matchArtists({ style, city, budget });
        return {
          summary: {
            style,
            bodyZone,
            size,
            budget,
            city,
            referenceNote: referenceNote ?? null,
          },
          priceEstimate: price,
          artists,
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
    stopWhen: stepCountIs(8),
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
  });
}
