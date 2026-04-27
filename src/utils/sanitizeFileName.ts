export function sanitizeFileName(fileName: string) {
  const parts = fileName.split(".");

  const ext = parts.length > 1 ? parts.pop() : "";
  const base = parts.join(".");

  const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, "_");

  return {
    base: safeBase,
    ext: ext ? ext.toLowerCase() : "",
  };
}
