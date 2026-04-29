import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildWinkBm25Index,
  loadAllChunksPaginated,
  searchInBm25Index,
  tokenizeForBm25,
  type Bm25Chunk,
} from "./bm25.ts";

test("tokenizeForBm25 normalizes text and removes stopwords/noise", () => {
  const tokens = tokenizeForBm25(
    "The Alpha-Beta's systems, and THE data... in production!",
  );

  assert.deepEqual(tokens, ["alpha", "betas", "systems", "data", "production"]);
});

test("loadAllChunksPaginated loads all rows when corpus exceeds 1000 chunks", async () => {
  const rows: Bm25Chunk[] = Array.from({ length: 1201 }, (_, index) => ({
    id: `chunk-${index}`,
    doc_id: "doc-1",
    chunk_index: index,
    title: null,
    content: `Chunk content ${index}`,
  }));

  const calls: Array<{ from: number; to: number }> = [];

  const result = await loadAllChunksPaginated({
    pageSize: 1000,
    fetchPage: async (from, to) => {
      calls.push({ from, to });
      return rows.slice(from, to + 1);
    },
  });

  assert.equal(result.length, 1201);
  assert.deepEqual(calls, [
    { from: 0, to: 999 },
    { from: 1000, to: 1999 },
  ]);
});

test("buildWinkBm25Index/searchInBm25Index returns relevant chunks", () => {
  const chunks: Bm25Chunk[] = [
    {
      id: "a",
      doc_id: "d1",
      chunk_index: 0,
      title: "Incident Response",
      content: "Incident response playbook for production outages.",
    },
    {
      id: "b",
      doc_id: "d2",
      chunk_index: 0,
      title: "Onboarding",
      content: "Developer onboarding checklist and setup guide.",
    },
  ];

  const index = buildWinkBm25Index(chunks);
  const hits = searchInBm25Index(index, "production incident response", 5);

  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "a");
  assert.ok(hits[0].score > 0);
});
