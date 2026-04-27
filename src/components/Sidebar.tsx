"use client";

import { ExternalLink, FileTextIcon, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

interface DocumentInfo {
  id: string;
  name: string;
  url?: string;
  size?: number;
  uploadedAt?: string;
}

export function Sidebar() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    const response = await fetch("/api/docs");
    const payload = (await response.json()) as {
      error?: string;
      docs?: Array<{
        id: string;
        file_name: string;
        file_url: string;
        created_at: string;
      }>;
    };

    if (!response.ok || !payload.docs) {
      throw new Error(payload.error || "Failed to fetch documents.");
    }

    const nextDocuments: DocumentInfo[] = payload.docs.map((doc) => ({
      id: doc.id,
      name: doc.file_name,
      url: doc.file_url,
      uploadedAt: doc.created_at,
    }));

    return nextDocuments;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialDocuments = async () => {
      try {
        setIsLoadingDocs(true);
        setDocsError(null);
        const docs = await fetchDocuments();

        if (isMounted) {
          setDocuments(docs);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch documents.";
        if (isMounted) {
          setDocsError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingDocs(false);
        }
      }
    };

    loadInitialDocuments();

    return () => {
      isMounted = false;
    };
  }, [fetchDocuments]);

  const refreshDocuments = async () => {
    try {
      setDocsError(null);
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch documents.";
      setDocsError(message);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    const toastId = toast.loading("Uploading document...");

    try {
      setUploadError(null);
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        doc?: {
          id: string;
          file_name: string;
          bucket_key: string;
          file_url: string;
          created_at: string;
        };
      };

      if (!response.ok || !payload.doc) {
        throw new Error(payload.error || "Upload failed");
      }

      await refreshDocuments();
      toast.update(toastId, {
        render: "Document uploaded successfully.",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload file.";
      setUploadError(message);
      toast.update(toastId, {
        render: message,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    const toastId = toast.loading("Deleting document...");

    try {
      setDocsError(null);
      setDeletingDocId(docId);

      const response = await fetch(`/api/upload/${docId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete document.");
      }

      await refreshDocuments();
      toast.update(toastId, {
        render: payload.message || "Document deleted successfully.",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete document.";
      setDocsError(message);
      toast.update(toastId, {
        render: message,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <aside className="glass-panel relative flex flex-col h-[calc(95vh-64px)] gap-5">
      <h2 className="text-xl text-center py-4 font-semibold text-gray-900 tracking-tight">
        Knowledge Base
      </h2>

      <div
        className={`!p-6 h-[calc(30vh-32px)] flex items-center justify-center border-2 border-dashed rounded-2xl text-center relative transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden group ${
          isDragging || isUploading
            ? "border-accent-color bg-[rgba(53,133,142,0.1)] shadow-[0_0_30px_rgba(53,133,142,0.2)]"
            : "border-[rgba(53,133,142,0.2)] bg-[rgba(255,255,255,0.4)] hover:border-accent-hover hover:bg-[rgba(53,133,142,0.05)] hover:shadow-[0_0_20px_rgba(53,133,142,0.1)]"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".pdf,.docs,.txt"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center gap-3"
        >
          <div className="bg-[rgba(53,133,142,0.05)] p-3 rounded-full text-accent-color transition-all duration-300 group-hover:bg-[rgba(53,133,142,0.15)] group-hover:shadow-[0_4px_12px_rgba(53,133,142,0.2)]">
            <Upload
              className={`w-6 h-6 ${isUploading ? "animate-pulse-custom" : ""}`}
            />
          </div>
          {isUploading ? (
            <span className="text-sm text-text-secondary">Uploading...</span>
          ) : (
            <span className="text-sm text-text-secondary">
              Drag & drop or{" "}
              <span className="text-accent-color font-medium">browse</span>
            </span>
          )}
        </label>
      </div>
      {uploadError && (
        <p className="text-xs text-red-600 px-1">{uploadError}</p>
      )}
      {docsError && <p className="text-xs text-red-600 px-1">{docsError}</p>}

      <div className="flex-1 flex flex-col !px-6 !pb-6">
        <h3 className="text-[0.85rem] uppercase tracking-wider text-text-secondary mb-4 font-semibold">
          Uploaded Documents
        </h3>
        <ul className="list-none overflow-y-auto flex-1 flex flex-col gap-3 pr-2">
          {isLoadingDocs ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-3">
              <FileTextIcon className="w-8 h-8 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                Loading documents...
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-3">
              <FileTextIcon className="w-8 h-8 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                No documents uploaded yet.
                <br />
                Upload files to begin searching.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 !py-3.5 !px-4 bg-[rgba(255,255,255,0.4)] rounded-xl border border-[rgba(53,133,142,0.1)] transition-all duration-300 cursor-default hover:bg-[rgba(53,133,142,0.05)] group"
              >
                <div className="min-w-0 flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-lg transition-colors">
                    <FileTextIcon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <span
                    className="text-sm whitespace-nowrap overflow-hidden text-ellipsis text-text-primary font-medium"
                    title={doc.name}
                  >
                    {doc.name}
                  </span>
                </div>
                <div className="ml-2 flex items-center gap-3 shrink-0">
                  <Link
                    href={doc?.url ?? ""}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center cursor-pointer"
                    aria-label={`Open ${doc.name}`}
                  >
                    <ExternalLink className="w-4 h-4 text-text-secondary hover:text-accent-color transition-colors" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingDocId === doc.id}
                    className="inline-flex items-center justify-center cursor-pointer text-text-secondary hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Delete ${doc.name}`}
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
