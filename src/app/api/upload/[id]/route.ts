import { DOCS_BUCKET, getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return Response.json(
        { error: "Document id is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: doc, error: fetchError } = await supabase
      .from("docs")
      .select("id, bucket_key")
      .eq("id", id)
      .single();

    if (fetchError || !doc) {
      return Response.json({ error: "Document not found." }, { status: 404 });
    }

    const { error: storageError } = await supabase.storage
      .from(DOCS_BUCKET)
      .remove([doc.bucket_key]);

    if (storageError) {
      return Response.json({ error: storageError.message }, { status: 500 });
    }
    const { error: chunkDeleteError } = await supabase
      .from("doc_chunks")
      .delete()
      .eq("doc_id", id);

    if (chunkDeleteError) {
      return Response.json(
        { error: chunkDeleteError.message },
        { status: 500 },
      );
    }
    const { error: deleteError } = await supabase
      .from("docs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ message: "Document deleted successfully." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
