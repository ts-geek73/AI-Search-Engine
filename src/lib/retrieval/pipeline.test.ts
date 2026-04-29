import assert from "node:assert/strict";
import { test } from "node:test";

import type { Bm25SearchHit } from "./bm25.ts";
import {
  evaluateBm25Confidence,
  rerankMatches,
  runRetrievalPipeline,
  type SearchMatch,
} from "./pipeline.ts";

const STRONG_OPTIONS = {
  strongMinRatio: 1.15,
  strongMinCoverage: 0.55,
  minHits: 3,
  candidateCap: 200,
};

test("evaluateBm25Confidence marks query as strong when thresholds are met", () => {
  const hits: Bm25SearchHit[] = [
    {
      id: "a",
      doc_id: "d1",
      chunk_index: 0,
      title: "Platform Reliability",
      content: "Platform reliability policy and incident response workflow.",
      score: 2.0,
    },
    {
      id: "b",
      doc_id: "d1",
      chunk_index: 1,
      title: null,
      content: "General operations note.",
      score: 1.1,
    },
    {
      id: "c",
      doc_id: "d2",
      chunk_index: 0,
      title: null,
      content: "Another related chunk.",
      score: 0.9,
    },
  ];

  const confidence = evaluateBm25Confidence({
    query: "platform reliability policy",
    matchCount: 8,
    hits,
    strongMinRatio: STRONG_OPTIONS.strongMinRatio,
    strongMinCoverage: STRONG_OPTIONS.strongMinCoverage,
    minHits: STRONG_OPTIONS.minHits,
  });

  assert.equal(confidence.strong, true);
  assert.equal(confidence.hitCount, 3);
  assert.ok(confidence.scoreRatio >= STRONG_OPTIONS.strongMinRatio);
});

test("strong BM25 path skips embedding and vector search", async () => {
  let embedCalls = 0;
  let vectorCalls = 0;

  const bm25Hits: Bm25SearchHit[] = [
    {
      id: "a",
      doc_id: "d1",
      chunk_index: 0,
      title: "Platform Reliability",
      content: "Platform reliability policy and incident response workflow.",
      score: 2.1,
    },
    {
      id: "b",
      doc_id: "d1",
      chunk_index: 1,
      title: "Reliability FAQ",
      content: "Reliability FAQ for production policy.",
      score: 1.2,
    },
    {
      id: "c",
      doc_id: "d2",
      chunk_index: 0,
      title: null,
      content: "Reliability process appendix.",
      score: 0.8,
    },
  ];

  const result = await runRetrievalPipeline({
    query: "platform reliability policy",
    matchCount: 5,
    options: STRONG_OPTIONS,
    deps: {
      bm25Search: async () => bm25Hits,
      embedQuery: async () => {
        embedCalls += 1;
        return [0.1, 0.2];
      },
      vectorSearchSubset: async () => {
        vectorCalls += 1;
        return [];
      },
      rerank: rerankMatches,
    },
  });

  assert.equal(result.retrievalStage, "bm25");
  assert.equal(result.bm25Strong, true);
  assert.equal(result.matches.length, 3);
  assert.equal(embedCalls, 0);
  assert.equal(vectorCalls, 0);
});

test("weak BM25 path falls back to hybrid subset vector search", async () => {
  let embedCalls = 0;
  let vectorCalls = 0;
  let receivedCandidateIds: string[] = [];

  const bm25Hits: Bm25SearchHit[] = [
    {
      id: "a",
      doc_id: "d1",
      chunk_index: 0,
      title: "Search tuning",
      content: "Search tuning baseline notes.",
      score: 1.01,
    },
    {
      id: "b",
      doc_id: "d2",
      chunk_index: 1,
      title: "Search tuning appendix",
      content: "Search tuning implementation details.",
      score: 1.0,
    },
    {
      id: "c",
      doc_id: "d2",
      chunk_index: 2,
      title: null,
      content: "Search runbook.",
      score: 0.99,
    },
  ];

  const vectorMatches: SearchMatch[] = [
    {
      id: "b",
      doc_id: "d2",
      chunk_index: 1,
      title: "Search tuning appendix",
      content: "Search tuning implementation details.",
      similarity: 0.77,
    },
    {
      id: "a",
      doc_id: "d1",
      chunk_index: 0,
      title: "Search tuning",
      content: "Search tuning baseline notes.",
      similarity: 0.81,
    },
  ];

  const result = await runRetrievalPipeline({
    query: "search tuning",
    matchCount: 4,
    options: STRONG_OPTIONS,
    deps: {
      bm25Search: async () => bm25Hits,
      embedQuery: async () => {
        embedCalls += 1;
        return [0.1, 0.2, 0.3];
      },
      vectorSearchSubset: async ({ candidateIds }) => {
        vectorCalls += 1;
        receivedCandidateIds = candidateIds;
        return vectorMatches;
      },
      rerank: rerankMatches,
    },
  });

  assert.equal(result.retrievalStage, "hybrid");
  assert.equal(result.bm25Strong, false);
  assert.equal(embedCalls, 1);
  assert.equal(vectorCalls, 1);
  assert.deepEqual(receivedCandidateIds, ["a", "b", "c"]);
  assert.equal(result.matches.length, 2);
});

test("empty BM25 results return graceful empty response", async () => {
  let embedCalls = 0;
  let vectorCalls = 0;

  const result = await runRetrievalPipeline({
    query: "unseen query",
    matchCount: 8,
    options: STRONG_OPTIONS,
    deps: {
      bm25Search: async () => [],
      embedQuery: async () => {
        embedCalls += 1;
        return [0.1];
      },
      vectorSearchSubset: async () => {
        vectorCalls += 1;
        return [];
      },
      rerank: rerankMatches,
    },
  });

  assert.equal(result.retrievalStage, "hybrid");
  assert.equal(result.matches.length, 0);
  assert.equal(result.candidateCount, 0);
  assert.equal(embedCalls, 0);
  assert.equal(vectorCalls, 0);
});
