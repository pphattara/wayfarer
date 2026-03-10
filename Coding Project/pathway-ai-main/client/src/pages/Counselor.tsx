import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Send, Plus, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SUGGESTED = [
  "What GPA do I need for MIT?",
  "How does UCAS work for UK universities?",
  "What is the F-1 student visa process?",
  "How do I write a strong personal statement?",
  "What scholarships exist for international students?",
];

type Message = { role: string; content: string };

export default function Counselor() {
  const { data: conversations, refetch: refetchConvs } = trpc.ai.getConversations.useQuery();
  const [convId, setConvId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isSending) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setIsSending(true);
    setStreamingText("");

    try {
      const response = await fetch("/api/counselor/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversationId: convId }),
      });

      if (!response.ok || !response.body) {
        setError("AI unavailable, please try again.");
        setIsSending(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let newConvId: number | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const rawText = decoder.decode(value, { stream: true });
        const lines = rawText.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const event = JSON.parse(payload);
            if (event.type === "chunk") {
              accumulated += event.content;
              setStreamingText(accumulated);
            } else if (event.type === "done") {
              newConvId = event.conversationId;
            } else if (event.type === "error") {
              setError(event.message);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      if (accumulated) {
        setMessages((m) => [...m, { role: "assistant", content: accumulated }]);
      }
      setStreamingText("");
      if (newConvId) {
        setConvId(newConvId);
        refetchConvs();
      }
    } catch {
      setError("AI unavailable, please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const startNew = () => {
    setConvId(undefined);
    setMessages([]);
    setStreamingText("");
    setError(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />AI Counselor
        </h1>
        <p className="text-muted-foreground mt-1">
          24/7 AI advisor for admissions questions, visa guidance, and application strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sidebar: conversation history */}
        <div className="hidden lg:flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={startNew} className="gap-1.5 w-full">
            <Plus className="w-3.5 h-3.5" />New Chat
          </Button>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {(conversations ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setConvId(c.id); setMessages([]); setError(null); }}
                  className={`w-full text-left text-xs p-2 rounded-lg truncate transition-colors ${
                    c.id === convId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="w-3 h-3 inline mr-1.5" />
                  {c.title}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat pane */}
        <div className="lg:col-span-3 flex flex-col border border-border rounded-xl overflow-hidden bg-background">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && !streamingText ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7 text-indigo-600" />
                </div>
                <h2 className="font-semibold mb-2">PathwayAI Counselor</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Ask me anything about university admissions, essays, visas, scholarships, and more.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {/* Live streaming bubble */}
                {streamingText && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-muted text-foreground whitespace-pre-wrap">
                      {streamingText}
                      <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 align-middle animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Thinking indicator before first chunk */}
                {isSending && !streamingText && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-muted-foreground">
                      Thinking...
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-destructive/10 text-destructive">
                      {error}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask anything about admissions..."
              className="flex-1"
              disabled={isSending}
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || isSending}
              size="icon"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
