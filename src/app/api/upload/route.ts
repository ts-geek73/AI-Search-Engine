import { GEMINI } from "@/lib/gemini";
import { DOCS_BUCKET, getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadSchema } from "@/schemas/file";
import { sanitizeFileName } from "@/utils/sanitizeFileName";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileData = formData.get("file");
    const { file } = await uploadSchema.validate(
      { file: fileData },
      { abortEarly: false },
    );
    console.log("🚀 ~ POST ~ file:", file)

    const supabase = getSupabaseServerClient();
    const bucket = DOCS_BUCKET;
    const model = GEMINI.getGenerativeModel({ model: "gemini-embedding-2" });

    const { base, ext } = sanitizeFileName(file.name || "document");
    const fileKey = `${base}-${Date.now()}.${ext}`;
    const fileBytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileKey, fileBytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileKey);

    const { data: insertedDoc, error: insertError } = await supabase
      .from("docs")
      .insert({
        file_name: file.name,
        bucket_key: fileKey,
        file_url: publicUrl,
        embedded_data: [],
      })
      .select("id, file_name, bucket_key, file_url, created_at")
      .single();

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    return Response.json({ doc: insertedDoc }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
