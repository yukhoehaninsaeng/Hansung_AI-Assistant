import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import {
  ChevronDown,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const HANSUNG_NAVY = "#1e3476";
const HANSUNG_SKY = "#0098d4";

const SUGGESTED_PROMPTS = [
  "수강 신청 안내해주세요",
  "입학 관련 정보 알려주세요",
  "학교 공지사항 알려주세요",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const publicChat = trpc.chat.publicChat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "assistant", content: data.content },
      ]);
      setSending(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "죄송합니다. 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
        },
      ]);
      setSending(false);
    },
  });

  useEffect(() => {
    if (!sending) return;
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => clearTimeout(t);
  }, [messages, sending]);

  const handleSend = (content?: string) => {
    const msg = (content !== undefined ? content : input).trim();
    if (!msg || sending) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);

    publicChat.mutate({
      messages: next.map((m) => ({ role: m.role, content: m.content })),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 flex-shrink-0 shadow-sm"
        style={{ height: 56, backgroundColor: HANSUNG_NAVY }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/Hansung UI.webp"
            alt="한성대학교"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-white font-bold text-sm tracking-tight">
            HANSUNG AI 도우미
          </span>
        </div>
        {hasMessages && (
          <button
            onClick={() => setMessages([])}
            title="대화 초기화"
            className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.1)")
            }
          >
            <Trash2 size={12} />
            대화 초기화
          </button>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {!hasMessages ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span
                className="font-black text-gray-100"
                style={{ fontSize: "clamp(80px, 18vw, 200px)", letterSpacing: "-0.02em" }}
              >
                HSU
              </span>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center gap-2 mb-8">
              <h1 className="text-2xl font-bold tracking-tight">
                <span style={{ color: HANSUNG_NAVY }}>한성대학교</span>{" "}
                <span style={{ color: HANSUNG_SKY }}>AI 도우미</span>
              </h1>
              <p className="text-gray-500 text-sm">안녕하세요, 무엇을 도와드릴까요?</p>
            </div>

            {/* Suggested prompts */}
            <div className="relative z-10 flex gap-2 flex-wrap justify-center">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors shadow-sm"
                  style={{ color: HANSUNG_NAVY }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              {messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-gray-800 text-white text-sm px-4 py-3 rounded-2xl max-w-[70%] whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <img
                      src="/ai_profile.jpg"
                      alt="AI"
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">
                        HANSUNG AI 도우미
                      </p>
                      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm inline-block max-w-[85%]">
                        <div className="text-sm text-gray-800 leading-relaxed">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loading bubble */}
              {sending && (
                <div className="flex items-start gap-3">
                  <img
                    src="/ai_profile.jpg"
                    alt="AI"
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">
                      HANSUNG AI 도우미
                    </p>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                      <Loader2 size={16} className="animate-spin text-gray-400" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Scroll-to-bottom button */}
        {showScrollDown && (
          <button
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute left-1/2 -translate-x-1/2 bottom-28 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronDown size={18} className="text-gray-500" />
          </button>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요."
                disabled={sending}
                rows={hasMessages ? 2 : 3}
                className="w-full px-5 pt-4 pb-12 text-sm text-gray-800 placeholder-gray-400 resize-none outline-none bg-transparent"
              />
              <div className="absolute bottom-3 right-3">
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 text-white rounded-full flex items-center justify-center transition-colors disabled:bg-gray-200"
                  style={{
                    backgroundColor:
                      input.trim() && !sending ? HANSUNG_NAVY : undefined,
                  }}
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              한성 AI도우미는 AI이며 실수할 수 있습니다. 응답을 다시 한번 확인 주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
