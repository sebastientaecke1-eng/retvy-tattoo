import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function analyzeReferenceImage(
  imageUrl: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = createOpenAI({ apiKey });
    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: imageUrl },
            {
              type: "text",
              text: `Tu analyses une image de référence pour un projet de tatouage.
Décris en français en 2-3 phrases concises :
- style artistique probable
- zone du corps si identifiable
- couleur vs noir et gris
- éléments visuels clés
Ne propose pas de prix ni de créneau.`,
            },
          ],
        },
      ],
    });

    return text.trim() || null;
  } catch (err) {
    console.error("[analyze-reference-image]", err);
    return null;
  }
}
