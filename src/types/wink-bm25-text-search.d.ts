declare module 'wink-bm25-text-search' {
  interface BM25Options {
    fieldValues: Record<string, unknown>;
    bm25Params?: {
      k1?: number;
      b?: number;
      k?: number;
    };
  }

  interface SearchResult {
    [key: string]: unknown;
    score: number;
  }

  interface BM25 {
    defineConfig(config: {
      fldWeights: Record<string, number>;
      bm25Params?: {
        k1?: number;
        b?: number;
        k?: number;
      };
    }): void;

    definePrepTasks(tasks: unknown[]): void;

    addDoc(doc: Record<string, unknown>): void;

    consolidate(): void;

    search(query: string): SearchResult[];
  }

  function winkBM25(): BM25;

  export default winkBM25;
}