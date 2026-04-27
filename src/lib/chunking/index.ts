import path from "path";
import { PDFParse } from "pdf-parse";
import {
  CHUNK_MAX_CHARS,
  CHUNK_TARGET_CHARS,
  isLikelyHeading,
  OVERLAP_SENTENCE_COUNT,
  removeRepeatedHeadersAndFooters,
  SMALL_PARAGRAPH_MIN_CHARS,
  splitIntoSentences,
} from "./utiles";

PDFParse.setWorker(
  path.resolve(
    process.cwd(),
    "node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs",
  ),
);

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function stripHtmlMarkup(text: string): string {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/?(div|p|br|li|ul|ol|h[1-6]|section|article|header|footer|main|span|a|strong|em|b|i)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

export function cleanRawText(rawText: string): string {
  let text = rawText;

  text = stripHtmlMarkup(text);
  text = decodeHtmlEntities(text);

  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n");

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const filtered = removeRepeatedHeadersAndFooters(lines);

  text = filtered
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n");

  text = text.replace(/([^\n])\n(?!\n)([a-z0-9(])/g, "$1 $2");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

function mergeSmallParagraphs(paragraphs: string[]): string[] {
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph) continue;

    const last = result[result.length - 1];

    if (last && last.length < SMALL_PARAGRAPH_MIN_CHARS) {
      result[result.length - 1] = `${last}\n\n${paragraph}`;
    } else {
      result.push(paragraph);
    }
  }

  return result;
}

function splitLargeParagraph(paragraph: string): string[] {
  if (paragraph.length <= CHUNK_MAX_CHARS) return [paragraph];

  const sentences = splitIntoSentences(paragraph);

  if (sentences.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < paragraph.length; i += CHUNK_TARGET_CHARS) {
      const chunk = paragraph.slice(i, i + CHUNK_TARGET_CHARS).trim();
      if (chunk) chunks.push(chunk);
    }
    return chunks;
  }

  const result: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length > CHUNK_MAX_CHARS && current) {
      result.push(current.trim());
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) result.push(current.trim());

  return result;
}

function buildOverlapTail(text: string): string {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= OVERLAP_SENTENCE_COUNT) return text;
  return sentences.slice(-OVERLAP_SENTENCE_COUNT).join(" ");
}

export function createChunks(cleanText: string): string[] {
  const units = cleanText
    .split(/\n\n+/)
    .map((u) => u.trim())
    .filter(Boolean);

  const paragraphs = mergeSmallParagraphs(units).flatMap(splitLargeParagraph);

  const chunks: string[] = [];
  let activeTitle: string | null = null;
  let overlap = "";

  for (const unit of paragraphs) {
    if (!unit) continue;

    if (isLikelyHeading(unit)) {
      activeTitle = unit.replace(/[:\-–—]+$/, "").trim();
      continue;
    }

    const body = overlap ? `${overlap}\n\n${unit}` : unit;
    const chunk = activeTitle ? `# ${activeTitle}\n\n${body}` : body;

    chunks.push(chunk.trim());
    overlap = buildOverlapTail(unit);
  }

  return chunks;
}

export async function extractDocumentText(params: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<string> {
  const { fileBuffer, fileName, mimeType } = params;
  const name = fileName.toLowerCase();

  if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
    const uint8Array = new Uint8Array(fileBuffer);
    const parser = new PDFParse({ data: uint8Array });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text ?? "";
  }

  if (
    mimeType?.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  ) {
    return new TextDecoder("utf-8").decode(fileBuffer);
  }

  throw new Error(
    "Unsupported file type. Only PDF and plain text files are supported.",
  );
}

export async function extractTextAndCreateChunks(params: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<string[]> {
  const rawText = await extractDocumentText(params);
  const cleanedText = cleanRawText(rawText);
  return createChunks(cleanedText);
}
