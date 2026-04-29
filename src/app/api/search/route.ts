import { GemEmbeddingModel } from "@/lib/gemini";
import { searchDocChunksWithBm25 } from "@/lib/retrieval/bm25";
import {
  rerankMatches,
  runRetrievalPipeline,
  type SearchMatch,
} from "@/lib/retrieval/pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SearchRequest {
  query?: string;
  matchCount?: number;
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const BM25_STRONG_MIN_RATIO = parsePositiveNumber(
  process.env.BM25_STRONG_MIN_RATIO,
  1.15,
);
const BM25_STRONG_MIN_COVERAGE = parsePositiveNumber(
  process.env.BM25_STRONG_MIN_COVERAGE,
  0.55,
);
const BM25_MIN_HITS = Math.floor(
  parsePositiveNumber(process.env.BM25_MIN_HITS, 3),
);
const BM25_CANDIDATE_CAP = Math.floor(
  parsePositiveNumber(process.env.BM25_CANDIDATE_CAP, 200),
);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchRequest;
    const query = body.query?.trim();
    const matchCount = Math.max(1, Math.min(body.matchCount ?? 8, 20));

    if (!query) {
      return Response.json({ error: "Query is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const result = await runRetrievalPipeline({
      query,
      matchCount,
      options: {
        strongMinRatio: BM25_STRONG_MIN_RATIO,
        strongMinCoverage: BM25_STRONG_MIN_COVERAGE,
        minHits: BM25_MIN_HITS,
        candidateCap: BM25_CANDIDATE_CAP,
      },
      deps: {
        bm25Search: (rawQuery, limit) =>
          searchDocChunksWithBm25({
            query: rawQuery,
            limit,
            supabase,
          }),
        embedQuery: async (rawQuery) => {
          const embeddingResult = await GemEmbeddingModel.embedContent(rawQuery);
          return embeddingResult.embedding.values;
        },
        vectorSearchSubset: async ({ queryEmbedding, candidateIds, matchCount }) => {
          const { data, error } = await supabase.rpc("match_doc_chunks_subset", {
            query_embedding: queryEmbedding,
            candidate_ids: candidateIds,
            match_count: matchCount,
          });

          if (error) {
            throw new Error(error.message);
          }

          return (data ?? []) as SearchMatch[];
        },
        rerank: (rawQuery, matches) => rerankMatches(rawQuery, matches),
      },
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
