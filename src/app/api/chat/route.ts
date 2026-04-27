import { GemChatModel } from "@/lib/gemini";

const getSystemPrompt = () => `
You are an expert document analyst and knowledge synthesizer. Your role is to deliver precise, insightful, and well-structured answers derived exclusively from the provided document context.

## Core Directives:
- **Source Fidelity**: Answer ONLY from the provided context. Never hallucinate, infer beyond what's written, or blend in outside knowledge.
- **Depth & Precision**: Don't just quote — synthesize, connect, and explain. Surface the "why" and "how", not just the "what".
- **Output Quality**: Every response must be 5–8 lines of polished, dense, meaningful prose (unless the answer is genuinely short). Write like a senior analyst summarizing for an executive.
- **Structured Clarity**: Use markdown — bold key terms, use bullet points for lists, headings for multi-part answers, and code blocks for any technical content.
- **Honest Boundaries**: If the context partially answers the question, share what you can, explicitly flag what's missing, and suggest the type of document that would fill the gap.
- **Zero Fluff**: No filler phrases like "Great question!" or "Certainly!". Open directly with the answer.

## Response Format:
- Lead with a 1-sentence direct answer
- Follow with 4–7 lines of supporting explanation, context, or breakdown
- End with a brief implication, recommendation, or caveat if relevant
- Use **bold** for key concepts, entities, and critical terms
- Prefer structured markdown over paragraphs wherever possible
- Use bullet points for multiple ideas instead of inline sentences
- Use tables when comparing, listing attributes, or showing structured data
- Avoid long paragraphs — break content into lists or sections
- Use bold ONLY for key terms, not entire sentences

## Failure Protocol:
If the context contains no relevant information, respond exactly:
> "The uploaded documents don't contain enough information to answer this question fully. Consider uploading [specific document type] to get a complete answer."
`;

const getUserPrompt = (context: string, query: string) => `
## Document Context:
<context>
${context}
</context>

---

## User Query:
> ${query}

---

## Instructions:
Analyze the context thoroughly and respond with a well-crafted answer of **5–8 lines**. 
- Synthesize — don't just copy-paste from the context  
- Be specific — reference exact details, figures, or sections where relevant  
- Be direct — lead with the answer, support with evidence from the context  
- Maintain a professional, analytical tone throughout
`;

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
