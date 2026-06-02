"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MatchResult } from "@/lib/artists";
import { ChatResults } from "./chat-results";

const STYLE_CHIPS = [
  "Réalisme",
  "Japonais",
  "Minimaliste",
  "Blackwork",
  "Fineline",
  "Géométrique",
];
const SIZE_CHIPS = ["Petit (< 5cm)", "Moyen (5-15cm)", "Grand (> 15cm)"];

function detectChips(text: string): string[] {
  const t = text.toLowerCase();
  if (/(style|attire|inspire)/.test(t)) return STYLE_CHIPS;
  if (/(taille|grand|petit|moyen|dimension)/.test(t)) return SIZE_CHIPS;
  return [];
}

export function AiChat({ artistSlug }: { artistSlug?: string }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const kickedOff = useRef(false);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: artistSlug ? { artistSlug } : undefined,
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  let matchResult: MatchResult | null = null;
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (
        part.type === "tool-submit_match" &&
        "state" in part &&
        part.state === "output-available" &&
        "output" in part
      ) {
        matchResult = part.output as MatchResult;
      }
    }
  }

  useEffect(() => {
    if (matchResult) {
      try {
        sessionStorage.setItem("retvy:lastMatch", JSON.stringify(matchResult));
      } catch {
        /* ignore */
      }
    }
  }, [matchResult]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  useEffect(() => {
    if (kickedOff.current || messages.length > 0) return;
    if (status !== "ready") return;
    kickedOff.current = true;
    sendMessage({ text: "Bonjour" });
  }, [messages.length, status, sendMessage]);

  function handleSend(value: string) {
    const text = value.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastText =
    lastAssistant?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ??
    "";
  const chips =
    lastAssistant && !matchResult && !isLoading ? detectChips(lastText) : [];

  const visibleMessages = messages.filter(
    (m) =>
      !(
        m.role === "user" &&
        m.parts.length === 1 &&
        m.parts[0].type === "text" &&
        m.parts[0].text === "Bonjour" &&
        messages.indexOf(m) === 0
      ),
  );

  return (
    <div>
      <Card id="chat" className="overflow-hidden border-amber-500/10">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-zinc-200">
              Assistant projet Retvy
            </span>
            {matchResult && (
              <span className="ml-auto text-[10px] uppercase tracking-widest text-amber-400">
                Match trouvé
              </span>
            )}
          </div>

          <div
            ref={scrollRef}
            className="flex max-h-[min(420px,60vh)] min-h-[320px] flex-col space-y-4 overflow-y-auto p-4"
          >
            {visibleMessages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              if (!text.trim()) return null;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-amber-500/15 text-amber-50"
                      : "bg-zinc-900 text-zinc-300",
                  )}
                >
                  {text}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                L&apos;IA réfléchit…
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error.message?.includes("OPENAI")
                  ? "Clé OpenAI manquante — ajoutez OPENAI_API_KEY dans .env.local"
                  : "Une erreur est survenue. Réessayez."}
              </p>
            )}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-zinc-800/50 px-4 py-3">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSend(chip)}
                  className="cursor-pointer rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-300"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {!matchResult && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2 border-t border-zinc-800 p-4"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Décrivez votre idée de tatouage…"
                disabled={isLoading}
                className="flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-black transition-transform hover:bg-amber-400 disabled:opacity-30"
                aria-label="Envoyer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      {matchResult && <ChatResults result={matchResult} />}
    </div>
  );
}
