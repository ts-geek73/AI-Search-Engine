"use client";

import React, { useEffect, useState } from "react";
import { Icons } from "./Icons";

interface DocumentInfo {
  id: string;
  name: string;
  size?: number;
  uploadedAt?: string;
}

export function Sidebar() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {}, []);

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
    setIsUploading(true);
    setTimeout(() => {
      setDocuments((prev) => [
        { id: Math.random().toString(), name: file.name },
        ...prev,
      ]);
      setIsUploading(false);
    }, 1500);
  };

  return (
    <aside className="glass-panel flex flex-col h-[calc(95vh-64px)] gap-5">
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center gap-3"
        >
          <div className="bg-[rgba(53,133,142,0.05)] p-3 rounded-full text-accent-color transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-[rgba(53,133,142,0.15)] group-hover:shadow-[0_4px_12px_rgba(53,133,142,0.2)]">
            <Icons.Upload
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

      <div className="flex-1 flex flex-col !px-6 !pb-6">
        <h3 className="text-[0.85rem] uppercase tracking-wider text-text-secondary mb-4 font-semibold">
          Uploaded Documents
        </h3>
        <ul className="list-none overflow-y-auto flex-1 flex flex-col gap-3 pr-2">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-3">
              <Icons.FileText className="w-8 h-8 text-text-secondary" />
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
                className="flex items-center gap-4 py-3.5 px-4 bg-[rgba(255,255,255,0.4)] rounded-xl border border-[rgba(53,133,142,0.1)] transition-all duration-300 cursor-default hover:bg-[rgba(53,133,142,0.05)] hover:border-[rgba(53,133,142,0.3)] hover:shadow-[0_0_15px_rgba(53,133,142,0.15)] hover:-translate-y-0.5 group"
              >
                <div className="bg-[rgba(53,133,142,0.05)] p-2 rounded-lg group-hover:bg-accent-color group-hover:text-white transition-colors">
                  <Icons.FileText className="w-4 h-4 text-text-secondary group-hover:text-white" />
                </div>
                <span
                  className="text-sm whitespace-nowrap overflow-hidden text-ellipsis text-text-primary font-medium"
                  title={doc.name}
                >
                  {doc.name}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
