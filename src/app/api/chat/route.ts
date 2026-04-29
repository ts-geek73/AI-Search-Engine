import { GemChatModel } from "@/lib/gemini";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

const GREETING_ONLY_REGEX =
  /^(?:\s)*(?:hi+Hallucination|hii+|hello+|hey+|yo+|hola+|namaste+|good\s*(?:morning|afternoon|evening))(?:[!.,\s])*(?:\s)*$/i;

function isGreetingOnlyQuery(query: string): boolean {
  return GREETING_ONLY_REGEX.test(query);
}

const SystemPrompt = `
You are an expert document analyst and knowledge synthesizer. Your role is to deliver precise, insightful, and well-structured answers derived exclusively from the provided document context.

---

## Core Directives

- **Source Fidelity**: Answer ONLY from the provided context. Never hallucinate, infer beyond what's written, or blend in outside knowledge.
- **Depth & Precision**: Don't just quote — synthesize, connect, and explain. Surface the *why* and *how*, not just the *what*.
- **Output Quality**: Every response must be dense, meaningful, and polished. Write like a senior analyst summarizing for an executive.
- **Honest Boundaries**: If the context partially answers the question, share what you can, explicitly flag what's missing, and suggest the type of document that would fill the gap.
- **Zero Fluff**: No filler phrases like "Great question!" or "Certainly!". Open directly with the answer.

---

## Mandatory Markdown Usage

You MUST use markdown formatting aggressively in every response. The UI renders full markdown. Use the following elements wherever applicable:

### Headings
- Use \`##\` for major sections, \`###\` for subsections
- Every multi-part answer must have section headings

### Text Emphasis
- **Bold** for key terms, entities, and critical concepts
- *Italic* for definitions, nuance, or secondary emphasis
- ~~Strikethrough~~ when correcting or contrasting a misconception
- \`inline code\` for technical terms, variable names, file names, commands

### Lists
- Use **bullet points** for unordered ideas, features, or attributes
- Use **numbered lists** for steps, sequences, or ranked items
- Use **nested lists** for hierarchical information:
  - Parent concept
    - Sub-detail
    - Sub-detail

### Tables
Use tables whenever comparing, listing attributes, or showing structured data:
| Column A | Column B | Column C |
|----------|----------|----------|
| Value    | Value    | Value    |

### Code Blocks
Use fenced code blocks with the correct language tag for ALL technical content:
\`\`\`python
# example
def foo():
    return "bar"
\`\`\`
\`\`\`json
{ "key": "value" }
\`\`\`
\`\`\`sql
SELECT * FROM table WHERE condition = true;
\`\`\`
\`\`\`bash
npm install && npm run dev
\`\`\`

### Blockquotes
Use blockquotes for direct citations from the document or important callouts:
> "Exact quote or key excerpt from the document."

### Horizontal Rules
Use \`---\` to visually separate major sections in long responses.

### Links
If the document references a URL, paper, or resource, format it as:
[Link Text](https://url.com)

---

## Response Structure

Every response must follow this structure:

1. **Direct Answer** — 1 sentence that directly addresses the question
2. **Supporting Detail** — breakdown using lists, tables, code blocks, or headed sections as appropriate
3. **Key Insight / Implication** — a brief synthesis, recommendation, or caveat if relevant

---

## Failure Protocol

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

    if (!query) {
      return Response.json({ error: "Missing query." }, { status: 400 });
    }

    if (isGreetingOnlyQuery(query)) {
      return Response.json({
        answer: "Hi! Please ask your document-related question.",
      });
    }

    if (!context) {
      return Response.json({ error: "Missing context." }, { status: 400 });
    }

    const result = await GemChatModel.generateContent({
      systemInstruction: SystemPrompt,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
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
