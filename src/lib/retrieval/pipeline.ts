import { tokenizeForBm25, type Bm25SearchHit } from "./bm25.ts";

export interface SearchMatch {
  id: string;
  doc_id: string;
  chunk_index: number;
  title: string | null;
  content: string;
  similarity: number;
}

export interface RetrievalPipelineOptions {
  strongMinRatio: number;
  strongMinCoverage: number;
  minHits: number;
  candidateCap: number;
}

export interface RetrievalPipelineDeps {
  bm25Search: (query: string, limit: number) => Promise<Bm25SearchHit[]>;
  embedQuery: (query: string) => Promise<number[]>;
  vectorSearchSubset: (params: {
    queryEmbedding: number[];
    candidateIds: string[];
    matchCount: number;
  }) => Promise<SearchMatch[]>;
  rerank: (query: string, matches: SearchMatch[]) => SearchMatch[];
}

export interface Bm25Confidence {
  strong: boolean;
  scoreRatio: number;
  topLexicalCoverage: number;
  hitCount: number;
  topScore: number;
}

export interface RetrievalPipelineResult {
  matches: SearchMatch[];
  retrievalStage: "bm25" | "hybrid";
  bm25Strong: boolean;
  bm25TopScore: number;
  candidateCount: number;
}

export function scoreLexicalOverlap(query: string, content: string): number {
  const queryTokens = new Set(tokenizeForBm25(query));
  if (!queryTokens.size) return 0;

  const contentTokens = new Set(tokenizeForBm25(content));
  let overlapCount = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) overlapCount += 1;
  }

  return overlapCount / queryTokens.size;
}

export function rerankMatches(query: string, matches: SearchMatch[]): SearchMatch[] {
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

export function getBm25CandidateLimit(matchCount: number, candidateCap: number): number {
  return Math.min(candidateCap, Math.max(matchCount * 12, 60));
}

export function evaluateBm25Confidence(params: {
  query: string;
  matchCount: number;
  hits: Bm25SearchHit[];
  strongMinRatio: number;
  strongMinCoverage: number;
  minHits: number;
}): Bm25Confidence {
  const topScore = params.hits[0]?.score ?? 0;
  const secondScore = params.hits[1]?.score ?? 0;
  const scoreRatio = topScore / Math.max(secondScore, 1e-6);
  const topHit = params.hits[0];
  const topLexicalCoverage = topHit
    ? scoreLexicalOverlap(params.query, `${topHit.title ?? ""} ${topHit.content}`)
    : 0;
  const hitCount = params.hits.length;
  const minHitsRequired = Math.min(params.minHits, params.matchCount);

  const strong =
    scoreRatio >= params.strongMinRatio &&
    topLexicalCoverage >= params.strongMinCoverage &&
    hitCount >= minHitsRequired;

  return {
    strong,
    scoreRatio,
    topLexicalCoverage,
    hitCount,
    topScore,
  };
}

export async function runRetrievalPipeline(params: {
  query: string;
  matchCount: number;
  options: RetrievalPipelineOptions;
  deps: RetrievalPipelineDeps;
}): Promise<RetrievalPipelineResult> {
  const { query, matchCount, deps, options } = params;
  const candidateLimit = getBm25CandidateLimit(matchCount, options.candidateCap);
  const bm25Hits = await deps.bm25Search(query, candidateLimit);

  const confidence = evaluateBm25Confidence({
    query,
    matchCount,
    hits: bm25Hits,
    strongMinRatio: options.strongMinRatio,
    strongMinCoverage: options.strongMinCoverage,
    minHits: options.minHits,
  });

  if (confidence.strong) {
    const matches = bm25Hits.slice(0, matchCount).map<SearchMatch>((hit) => ({
      id: hit.id,
      doc_id: hit.doc_id,
      chunk_index: hit.chunk_index,
      title: hit.title,
      content: hit.content,
      similarity: hit.score,
    }));

    return {
      matches,
      retrievalStage: "bm25",
      bm25Strong: true,
      bm25TopScore: confidence.topScore,
      candidateCount: bm25Hits.length,
    };
  }

  const candidateIds = bm25Hits.map((hit) => hit.id);
  if (!candidateIds.length) {
    return {
      matches: [],
      retrievalStage: "hybrid",
      bm25Strong: false,
      bm25TopScore: confidence.topScore,
      candidateCount: 0,
    };
  }

  const queryEmbedding = await deps.embedQuery(query);
  const vectorMatches = await deps.vectorSearchSubset({
    queryEmbedding,
    candidateIds,
    matchCount,
  });

  const matches = deps.rerank(query, vectorMatches).slice(0, matchCount);

  return {
    matches,
    retrievalStage: "hybrid",
    bm25Strong: false,
    bm25TopScore: confidence.topScore,
    candidateCount: candidateIds.length,
  };
}
