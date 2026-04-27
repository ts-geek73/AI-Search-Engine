export const SENTENCE_BOUNDARY_REGEX = /(?<=[.!?])\s+/;
export const HEADER_FOOTER_MAX_LENGTH = 80;
export const REPEATED_LINE_THRESHOLD = 3;
export const SMALL_PARAGRAPH_MIN_CHARS = 220;
export const CHUNK_TARGET_CHARS = 1200;
export const CHUNK_MAX_CHARS = 1600;
export const OVERLAP_SENTENCE_COUNT = 2;

export function normalizeWhitespace(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}
export function isLikelyPageNumber(line: string): boolean {
  return /^(page\s+)?\d{1,4}(\s*\/\s*\d{1,4})?$/i.test(line.trim());
}
export function isLikelyHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 12) return false;

  const isAllCaps =
    /[A-Z]/.test(trimmed) &&
    trimmed === trimmed.toUpperCase() &&
    !/[a-z]/.test(trimmed);

  const endsWithHeadingPunctuation = /[:\-–—]$/.test(trimmed);

  return isAllCaps || endsWithHeadingPunctuation;
}
export function splitIntoSentences(text: string): string[] {
  return text
    .split(SENTENCE_BOUNDARY_REGEX)
    .map((s) => s.trim())
    .filter(Boolean);
}
export function removeRepeatedHeadersAndFooters(lines: string[]): string[] {
  const frequency = new Map<string, number>();

  for (const line of lines) {
    const normalized = normalizeWhitespace(line);
    if (!normalized || normalized.length > HEADER_FOOTER_MAX_LENGTH) continue;
    frequency.set(normalized, (frequency.get(normalized) ?? 0) + 1);
  }

  const repeated = new Set(
    [...frequency.entries()]
      .filter(([, count]) => count >= REPEATED_LINE_THRESHOLD)
      .map(([line]) => line),
  );

  return lines.filter((line) => {
    const normalized = normalizeWhitespace(line);
    if (!normalized) return true;
    if (isLikelyPageNumber(normalized)) return false;
    if (repeated.has(normalized)) return false;
    return true;
  });
}
