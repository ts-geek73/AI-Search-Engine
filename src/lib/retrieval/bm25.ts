import winkBm25 from "wink-bm25-text-search";

import { getSupabaseServerClient } from "../supabase/server.ts";

export interface Bm25Chunk {
  id: string;
  doc_id: string;
  chunk_index: number;
  title: string | null;
  content: string;
}

export interface Bm25SearchHit extends Bm25Chunk {
  score: number;
}

interface WinkBm25Engine {
  defineConfig: (config: {
    fldWeights: Record<string, number>;
    bm25Params?: { k1?: number; b?: number; k?: number };
  }) => boolean;
  definePrepTasks: (tasks: Array<(text: string) => string[]>, field?: string) => number;
  addDoc: (doc: Record<string, string>, uniqueId: string) => number;
  consolidate: (precision?: number) => boolean;
  search: (text: string, limit?: number) => Array<[string, number]>;
}

type WinkBm25Factory = () => WinkBm25Engine;

export interface Bm25IndexSnapshot {
  chunks: Bm25Chunk[];
  chunkById: Map<string, Bm25Chunk>;
  engine: WinkBm25Engine;
  builtAt: number;
}

const BM25_PAGE_SIZE = 1000;
const DEFAULT_BM25_TTL_SECONDS = 300;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "s",
  "such",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "will",
  "with",
]);

let cachedSnapshot: Bm25IndexSnapshot | null = null;
let cacheExpiresAt = 0;
let rebuildPromise: Promise<Bm25IndexSnapshot> | null = null;

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getBm25IndexTtlMs(): number {
  const seconds = parsePositiveNumber(
    process.env.BM25_INDEX_TTL_SECONDS,
    DEFAULT_BM25_TTL_SECONDS,
  );
  return Math.floor(seconds * 1000);
}

export function tokenizeForBm25(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function createWinkEngine(): WinkBm25Engine {
  const factory = winkBm25 as unknown as WinkBm25Factory;
  return factory();
}

export function buildWinkBm25Index(chunks: Bm25Chunk[]): Bm25IndexSnapshot {
  const engine = createWinkEngine();
  const chunkById = new Map<string, Bm25Chunk>();

  engine.defineConfig({
    fldWeights: {
      title: 1.2,
      content: 1,
    },
    bm25Params: {
      k1: 1.2,
      b: 0.75,
      k: 1,
    },
  });

  engine.definePrepTasks([tokenizeForBm25]);

  for (const chunk of chunks) {
    chunkById.set(chunk.id, chunk);
    engine.addDoc(
      {
        title: chunk.title ?? "",
        content: chunk.content,
      },
      chunk.id,
    );
  }

  if (chunks.length < 3) {
    for (let index = chunks.length; index < 3; index += 1) {
      engine.addDoc(
        {
          title: "__bm25_padding__",
          content: `__bm25_padding_${index}__`,
        },
        `__bm25_padding_${index}`,
      );
    }
  }

  engine.consolidate();

  return {
    chunks,
    chunkById,
    engine,
    builtAt: Date.now(),
  };
}

export function searchInBm25Index(
  index: Bm25IndexSnapshot,
  query: string,
  limit: number,
): Bm25SearchHit[] {
  if (!index.chunks.length || limit <= 0) return [];
  if (!tokenizeForBm25(query).length) return [];

  const results = index.engine.search(query, limit);
  const hits: Bm25SearchHit[] = [];

  for (const [chunkId, score] of results) {
    const chunk = index.chunkById.get(String(chunkId));
    if (!chunk) continue;

    hits.push({
      ...chunk,
      score: Number(score),
    });
  }

  return hits;
}

export async function loadAllChunksPaginated(params: {
  fetchPage: (from: number, to: number) => Promise<Bm25Chunk[]>;
  pageSize?: number;
}): Promise<Bm25Chunk[]> {
  const pageSize = params.pageSize ?? BM25_PAGE_SIZE;
  const allChunks: Bm25Chunk[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const page = await params.fetchPage(from, to);
    if (!page.length) break;

    allChunks.push(...page);
    if (page.length < pageSize) break;
  }

  return allChunks;
}

async function fetchAllChunksFromSupabase(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<Bm25Chunk[]> {
  return loadAllChunksPaginated({
    fetchPage: async (from, to) => {
      const { data, error } = await supabase
        .from("doc_chunks")
        .select("id, doc_id, chunk_index, title, content")
        .order("created_at", { ascending: true })
        .range(from, to);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as Bm25Chunk[];
    },
  });
}

async function rebuildBm25Index(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<Bm25IndexSnapshot> {
  const chunks = await fetchAllChunksFromSupabase(supabase);
  const snapshot = buildWinkBm25Index(chunks);
  cachedSnapshot = snapshot;
  cacheExpiresAt = Date.now() + getBm25IndexTtlMs();
  return snapshot;
}

async function getOrBuildBm25Index(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<Bm25IndexSnapshot> {
  if (cachedSnapshot && Date.now() < cacheExpiresAt) {
    return cachedSnapshot;
  }

  if (!rebuildPromise) {
    rebuildPromise = rebuildBm25Index(supabase).finally(() => {
      rebuildPromise = null;
    });
  }

  return rebuildPromise;
}

export function invalidateBm25IndexCache(): void {
  cachedSnapshot = null;
  cacheExpiresAt = 0;
  rebuildPromise = null;
}

export async function searchDocChunksWithBm25(params: {
  query: string;
  limit: number;
  supabase?: ReturnType<typeof getSupabaseServerClient>;
}): Promise<Bm25SearchHit[]> {
  const query = params.query.trim();
  if (!query) return [];

  const limit = Math.max(1, params.limit);
  const supabase = params.supabase ?? getSupabaseServerClient();
  const snapshot = await getOrBuildBm25Index(supabase);

  return searchInBm25Index(snapshot, query, limit);
}
