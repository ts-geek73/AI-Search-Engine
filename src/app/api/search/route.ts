import { GemEmbeddingModel } from "@/lib/gemini";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SearchRequest {
  query?: string;
  matchCount?: number;
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

    return Response.json({ matches: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
