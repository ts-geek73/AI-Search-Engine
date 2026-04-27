"use client";

import { Bot, FileText, Send, User } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  sources?: string[];
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

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: `I've analyzed the uploaded documents based on your query "${query}". Here is the synthesized information you requested.`,
        sources: [], // Will be populated by the actual API
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-[calc(100vh-32px)] m-4 ml-2 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(53,133,142,0.05)] to-transparent pointer-events-none"></div>
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
              className={`max-w-[85%] flex gap-4 py-4 px-5 rounded-2xl leading-relaxed text-[0.95rem] animate-slide-up shadow-lg ${
                msg.type === "bot"
                  ? "bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[rgba(53,133,142,0.2)] rounded-tl-none shadow-[0_4px_30px_rgba(53,133,142,0.1)]"
                  : "bg-gradient-to-br from-[rgba(53,133,142,0.15)] to-[rgba(125,167,140,0.15)] backdrop-blur-md border border-[rgba(53,133,142,0.1)] rounded-tr-none flex-row-reverse shadow-[0_4px_30px_rgba(53,133,142,0.1)]"
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
              <div className="flex flex-col gap-3 text-text-primary">
                <p>{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center mt-2 pt-3 border-t border-[rgba(53,133,142,0.1)]">
                    <span className="text-xs text-text-secondary uppercase tracking-wider">
                      Sources:
                    </span>
                    {msg.sources.map((src, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-[rgba(53,133,142,0.08)] rounded-full text-xs text-text-secondary transition-all duration-200 cursor-pointer hover:bg-[rgba(53,133,142,0.15)] hover:text-text-primary"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex w-full justify-start">
            <div className="max-w-[80%] flex gap-4 py-4 px-5 rounded-2xl leading-relaxed text-[0.95rem] animate-slide-up bg-[rgba(255,255,255,0.6)] border border-[rgba(53,133,142,0.1)] rounded-bl-sm items-center">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-accent-color to-secondary-color text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex gap-1.5 items-center h-full">
                <span
                  className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-typing"
                  style={{ animationDelay: "-0.32s" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-typing"
                  style={{ animationDelay: "-0.16s" }}
                ></span>
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-typing"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-[rgba(53,133,142,0.1)] relative z-10 bg-[rgba(255,255,255,0.3)]">
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 bg-[rgba(255,255,255,0.5)] border border-[rgba(53,133,142,0.2)] rounded-2xl p-2 transition-all duration-500 hover:bg-[rgba(255,255,255,0.7)] focus-within:border-[rgba(53,133,142,0.5)] focus-within:bg-[rgba(255,255,255,0.9)] focus-within:shadow-[0_0_30px_rgba(53,133,142,0.15)] backdrop-blur-sm"
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents..."
            className="flex-1 bg-transparent border-none text-text-primary text-base resize-none outline-none p-3 max-h-38 min-h-6 placeholder:text-[rgba(31,41,55,0.4)]"
            rows={1}
          />
          <button
            type="submit"
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-accent-color to-secondary-color text-white transition-all duration-300 shrink-0 self-end disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed hover:not-disabled:scale-105 hover:not-disabled:shadow-[0_0_20px_rgba(53,133,142,0.4)]"
            disabled={!inputValue.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
