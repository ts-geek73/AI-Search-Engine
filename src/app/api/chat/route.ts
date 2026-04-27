import { GemChatModel } from "@/lib/gemini";

const getSystemPrompt =
  () => `You are a helpful document assistant. Your job is to answer questions based strictly on the provided document context.

## Rules:
- Answer ONLY using the provided context
- If the answer is partially in the context, provide what you can and note what's missing
- Never fabricate or assume information not present in the context
- Be concise but thorough
- Always format responses with markdown (headings, bullet points, bold, code blocks where appropriate)
- If genuinely unable to answer, say: "The uploaded documents don't contain enough information to answer this question fully." and suggest what kind of document might help`;

const getUserPrompt = (
  context: string,
  query: string,
) => `## Relevant Document Context:
<context>
${context}
</context>

## User Question:
${query}

Answer based strictly on the context above.`;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { query, context } = (await request.json()) as {
      query: string;
      context: string;
    };

    if (!query || !context) {
      return Response.json(
        { error: "Missing query or context." },
        { status: 400 },
      );
    }

    const result = await GemChatModel.generateContent({
      systemInstruction: getSystemPrompt(),
      contents: [
        {
          role: "user",
          parts: [{ text: getUserPrompt(context, query) }],
        },
      ],
    });

    const answer = result.response.text();

    return Response.json({ answer });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
