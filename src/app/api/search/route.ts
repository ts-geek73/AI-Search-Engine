import { GemEmbeddingModel } from "@/lib/gemini";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SearchRequest {
  query?: string;
  matchCount?: number;
}

interface SearchMatch {
  id: string;
  doc_id: string;
  chunk_index: number;
  title: string | null;
  content: string;
  similarity: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreLexicalOverlap(query: string, content: string): number {
  const queryTokens = new Set(tokenize(query));
  if (!queryTokens.size) return 0;

  const contentTokens = new Set(tokenize(content));
  let overlapCount = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) overlapCount += 1;
  }

  return overlapCount / queryTokens.size;
}

function rerankMatches(query: string, matches: SearchMatch[]): SearchMatch[] {
  if (matches.length <= 1) return matches;

  const maxSimilarity = Math.max(...matches.map((m) => m.similarity || 0), 0);

  return [...matches].sort((a, b) => {
    const aSemantic = maxSimilarity > 0 ? a.similarity / maxSimilarity : 0;
    const bSemantic = maxSimilarity > 0 ? b.similarity / maxSimilarity : 0;

    const aLexical = scoreLexicalOverlap(query, `${a.title ?? ""} ${a.content}`);
    const bLexical = scoreLexicalOverlap(query, `${b.title ?? ""} ${b.content}`);

    const aScore = 0.75 * aSemantic + 0.25 * aLexical;
    const bScore = 0.75 * bSemantic + 0.25 * bLexical;

    return bScore - aScore;
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchRequest;
    const query = body.query?.trim();
    const matchCount = Math.max(1, Math.min(body.matchCount ?? 8, 20));

    if (!query) {
      return Response.json({ error: "Query is required." }, { status: 400 });
    }

    const embeddingResult = await GemEmbeddingModel.embedContent(query);
    const queryEmbedding = embeddingResult.embedding.values;

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.rpc("match_doc_chunks", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const rawMatches = (data ?? []) as SearchMatch[];
    const rankedMatches = rerankMatches(query, rawMatches).slice(0, matchCount);

    return Response.json({ matches: rankedMatches });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
