import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}
export const GEMINI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const GemChatModel = GEMINI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
export const GemEmbeddingModel = GEMINI.getGenerativeModel({ model: "gemini-embedding-2" });