"use client";

import { Bot, Send, User } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
}

interface SearchMatch {
  id: string;
  doc_id: string;
  chunk_index: number;
  title: string | null;
  content: string;
  similarity: number;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const query = inputValue;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Step 1: search for relevant chunks
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, matchCount: 10 }),
      });

      const searchPayload = (await searchRes.json()) as {
        error?: string;
        matches?: SearchMatch[];
      };

      if (!searchRes.ok)
        throw new Error(searchPayload.error || "Search failed.");

      const matches = searchPayload.matches ?? [];
      const context = matches.map((m) => m.content).join("\n\n---\n\n");

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, context }),
      });

      const chatPayload = (await chatRes.json()) as {
        error?: string;
        answer?: string;
      };

      if (!chatRes.ok) throw new Error(chatPayload.error || "Chat failed.");

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: chatPayload.answer ?? "No answer returned.",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "bot",
          content: `Sorry, I couldn't complete that: ${message}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-[calc(100vh-32px)] !p-6 m-4 ml-2 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(53,133,142,0.05)] to-transparent pointer-events-none" />
      <div className="p-6 relative z-10">
        <h2 className="text-xl font-bold bg-gradient-to-r from-accent-color to-secondary-color bg-clip-text text-transparent tracking-wide">
          AI Search Assistant
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
            <Bot className="w-16 h-16 text-accent-color mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-text-primary mb-2">
              How can I help you today?
            </h3>
            <p className="text-sm text-text-secondary max-w-md">
              Upload documents and ask questions to start exploring your
              knowledge base.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] flex py-4 px-5 rounded-xl leading-relaxed text-[0.95rem] animate-slide-up shadow-lg ${
                msg.type === "bot"
                  ? "bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[rgba(53,133,142,0.2)] shadow-[0_4px_30px_rgba(53,133,142,0.1)]"
                  : "bg-gradient-to-br from-[rgba(53,133,142,0.15)] to-[rgba(125,167,140,0.15)] backdrop-blur-md border border-[rgba(53,133,142,0.1)]  flex-row-reverse shadow-[0_4px_30px_rgba(53,133,142,0.1)]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                  msg.type === "bot"
                    ? "bg-gradient-to-br from-accent-color to-secondary-color text-white shadow-[0_0_15px_rgba(53,133,142,0.3)]"
                    : "bg-[rgba(53,133,142,0.1)] text-accent-color backdrop-blur-sm"
                }`}
              >
                {msg.type === "user" ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              <div className="flex flex-col justify-center !px-2 text-text-primary min-w-0">
                {msg.type === "bot" ? (
                  <div
                    className="prose prose-sm max-w-none
                    prose-headings:text-text-primary prose-headings:font-semibold
                    prose-p:text-text-primary prose-p:leading-relaxed prose-p:my-1
                    prose-strong:text-text-primary
                    prose-ul:text-text-primary prose-ul:my-1 prose-ul:pl-4
                    prose-ol:text-text-primary prose-ol:my-1 prose-ol:pl-4
                    prose-li:my-0.5
                    prose-code:bg-[rgba(53,133,142,0.1)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                    prose-pre:bg-[rgba(53,133,142,0.08)] prose-pre:border prose-pre:border-[rgba(53,133,142,0.15)] prose-pre:rounded-xl
                    prose-hr:border-[rgba(53,133,142,0.15)]
                  "
                  >
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex w-full justify-start">
            <div className="max-w-[80%] flex gap-4 py-4 px-5 items-center rounded-2xl leading-relaxed animate-slide-up bg-[rgba(255,255,255,0.6)] border border-[rgba(53,133,142,0.1)] rounded-bl-sm">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-accent-color to-secondary-color text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex gap-1.5 items-center">
                <span
                  className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-typing"
                  style={{ animationDelay: "-0.32s" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-typing"
                  style={{ animationDelay: "-0.16s" }}
                />
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-typing" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 relative z-10 bg-[rgba(255,255,255,0.3)]">
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 bg-[rgba(255,255,255,0.5)] border border-[rgba(53,133,142,0.2)] rounded-2xl !px-4 !py-2 transition-all duration-500 hover:bg-[rgba(255,255,255,0.7)] focus-within:border-[rgba(53,133,142,0.5)] focus-within:bg-[rgba(255,255,255,0.9)] focus-within:shadow-[0_0_30px_rgba(53,133,142,0.15)] backdrop-blur-sm"
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents..."
            className="flex-1 pl-2 bg-transparent border-none text-text-primary text-base resize-none outline-none p-3 placeholder:text-[rgba(31,41,55,0.4)]"
            rows={2}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="flex items-center justify-center size-7 rounded-xl bg-gradient-to-r from-accent-color to-secondary-color text-white transition-all duration-300 shrink-0 self-end disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed hover:not-disabled:scale-105 hover:not-disabled:shadow-[0_0_20px_rgba(53,133,142,0.4)]"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
