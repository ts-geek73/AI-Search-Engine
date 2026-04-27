import { extractTextAndCreateChunks } from "@/lib/chunking";
import { GemEmbeddingModel } from "@/lib/gemini";
import { DOCS_BUCKET, getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadSchema } from "@/schemas/file";
import { sanitizeFileName } from "@/utils/sanitizeFileName";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let uploadedFileKey: string | null = null;
  let insertedDocId: string | null = null;

  try {
    const formData = await request.formData();
    const fileData = formData.get("file");
    const { file } = await uploadSchema.validate(
      { file: fileData },
      { abortEarly: false },
    );

    const supabase = getSupabaseServerClient();

    const { base, ext } = sanitizeFileName(file.name || "document");
    const fileKey = `${base}-${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(fileKey, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    uploadedFileKey = fileKey;

    const {
      data: { publicUrl },
    } = supabase.storage.from(DOCS_BUCKET).getPublicUrl(fileKey);

    const { data: insertedDoc, error: insertError } = await supabase
      .from("docs")
      .insert({
        file_name: file.name,
        bucket_key: fileKey,
        file_url: publicUrl,
      })
      .select("id, file_name, bucket_key, file_url, created_at")
      .single();

    if (insertError || !insertedDoc) {
      return Response.json(
        { error: insertError?.message || "Failed to save document metadata." },
        { status: 500 },
      );
    }

    insertedDocId = insertedDoc.id;

    const chunks = await extractTextAndCreateChunks({
      fileBuffer,
      fileName: file.name,
      mimeType: file.type,
    });

    if (chunks.length === 0) {
      return Response.json(
        { error: "No meaningful text chunks found in the uploaded document." },
        { status: 400 },
      );
    }

    const chunkRows: Array<{
      doc_id: string;
      chunk_index: number;
      title: string | null;
      content: string;
      embedding: number[];
    }> = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index];
      const embeddingResult = await GemEmbeddingModel.embedContent(content);
      const embedding = embeddingResult.embedding.values;

      const titleMatch = content.match(/^#\s+(.+)$/m);

      chunkRows.push({
        doc_id: insertedDoc.id,
        chunk_index: index,
        title: titleMatch ? titleMatch[1].trim() : null,
        content,
        embedding,
      });
    }

    const { error: chunkInsertError } = await supabase
      .from("doc_chunks")
      .insert(chunkRows);

    if (chunkInsertError) {
      return Response.json(
        { error: chunkInsertError.message },
        { status: 500 },
      );
    }

    return Response.json(
      {
        doc: insertedDoc,
        chunkCount: chunkRows.length,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    if (uploadedFileKey || insertedDocId) {
      try {
        const supabase = getSupabaseServerClient();

        if (insertedDocId) {
          await supabase
            .from("docs_chunks")
            .delete()
            .eq("doc_id", insertedDocId);
          await supabase.from("docs").delete().eq("id", insertedDocId);
        }

        if (uploadedFileKey) {
          await supabase.storage.from(DOCS_BUCKET).remove([uploadedFileKey]);
        }
      } catch {
        // Ignore rollback errors, keep the original failure response.
      }
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
