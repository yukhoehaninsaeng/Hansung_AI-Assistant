import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import {
  AlignJustify,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  GraduationCap,
  Loader2,
  Phone,
  Search,
  Send,
  Settings,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewType = "welcome" | "history" | "chat";
type FeedbackType = "up" | "down" | "report" | null;

type OptimisticMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

type ConvMessage = {
  id: number | string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date | string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "수강 신청 안내해주세요",
  "수강 신청 방법이 궁금해요",
  "수강 신청 기간 안내해주세요",
];

const HANSUNG_NAVY = "#1e3476";
const HANSUNG_SKY = "#0098d4";

// ─── WelcomeView ─────────────────────────────────────────────────────────────

function WelcomeView({
  onSendMessage,
  messageInput,
  setMessageInput,
  isLoading,
  onNoticeClick,
  onAdmissionClick,
  isModeLoading,
}: {
  onSendMessage: (content?: string) => void;
  messageInput: string;
  setMessageInput: (v: string) => void;
  isLoading: boolean;
  onNoticeClick: () => void;
  onAdmissionClick: () => void;
  isModeLoading: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upper centered content */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6">
        {/* HSU Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span
            className="font-black text-gray-100"
            style={{ fontSize: "clamp(80px, 18vw, 200px)", letterSpacing: "-0.02em" }}
          >
            HSU
          </span>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            <span style={{ color: HANSUNG_NAVY }}>한성대학교</span>{" "}
            <span style={{ color: HANSUNG_SKY }}>AI 도우미</span>
          </h1>
          <p className="text-gray-500 text-base">안녕하세요, 무엇을 도와드릴까요?</p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 mt-5 w-full max-w-xl">
            {/* 공지사항 card */}
            <button
              onClick={onNoticeClick}
              disabled={isModeLoading}
              className="bg-white rounded-2xl border border-gray-200 p-4 text-left shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: HANSUNG_SKY }}
                >
                  {isModeLoading ? <Loader2 size={13} className="text-white animate-spin" /> : <Building2 size={13} className="text-white" />}
                </div>
                <span
                  className="font-semibold text-sm flex items-center gap-0.5"
                  style={{ color: HANSUNG_NAVY }}
                >
                  공지사항 <ChevronRight size={14} />
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                복잡하고 보기 어려운 공지사항을,
                <br />
                원하는 정보만 물어보면 바로 확인할 수 있어요.
              </p>
            </button>

            {/* 입학 안내 card */}
            <button
              onClick={onAdmissionClick}
              disabled={isModeLoading}
              className="bg-white rounded-2xl border border-gray-200 p-4 text-left shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: HANSUNG_SKY }}
                >
                  {isModeLoading ? <Loader2 size={13} className="text-white animate-spin" /> : <GraduationCap size={13} className="text-white" />}
                </div>
                <span
                  className="font-semibold text-sm flex items-center gap-0.5"
                  style={{ color: HANSUNG_NAVY }}
                >
                  입학 안내 <ChevronRight size={14} />
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                신입생 입학에 필요한 모든 절차와 경쟁률,
                <br />
                주요 일정까지 한 번에 손쉽게 안내해 드립니다.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: prompts + input */}
      <div className="px-8 pb-6 space-y-3">
        {/* Suggested prompts */}
        <div className="flex gap-2 justify-center flex-wrap">
          {SUGGESTED_PROMPTS.map((prompt) => {
            const [first, ...rest] = prompt.split(" ");
            return (
              <button
                key={prompt}
                onClick={() => onSendMessage(prompt)}
                disabled={isLoading}
                className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <span className="font-semibold text-gray-800">{first}</span>
                {rest.length > 0 && (
                  <span className="text-gray-500"> {rest.join(" ")}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Input */}
        <div className="max-w-3xl mx-auto relative bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요."
            disabled={isLoading}
            rows={3}
            className="w-full px-5 pt-4 pb-12 text-sm text-gray-800 placeholder-gray-400 resize-none outline-none bg-transparent"
          />
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => onSendMessage()}
              disabled={!messageInput.trim() || isLoading}
              className="w-9 h-9 text-white rounded-full flex items-center justify-center transition-colors disabled:bg-gray-200"
              style={{ backgroundColor: messageInput.trim() && !isLoading ? HANSUNG_NAVY : undefined }}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HistoryView ──────────────────────────────────────────────────────────────

function HistoryView({
  conversations,
  searchQuery,
  setSearchQuery,
  isLoading,
  onSelect,
  onDelete,
  selectedId,
}: {
  conversations: Array<{ id: number; title: string; updatedAt: Date | string }>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  isLoading: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  selectedId: number | null;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-lg font-bold mb-3" style={{ color: HANSUNG_NAVY }}>
          이전 기록
        </h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="대화 검색..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full outline-none bg-gray-50 focus:bg-white focus:border-gray-300 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <Clock size={36} className="mb-3 opacity-30" />
            <p className="text-sm">
              {searchQuery ? "검색 결과가 없습니다" : "대화 기록이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-w-2xl mx-auto">
            {conversations.map((conv) => {
              const isActive = selectedId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    backgroundColor: isActive ? HANSUNG_NAVY : undefined,
                    color: isActive ? "white" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: isActive ? "rgba(255,255,255,0.6)" : "#9ca3af" }}
                    >
                      {new Date(conv.updatedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                    style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ChatView ─────────────────────────────────────────────────────────────────

function ChatView({
  messages,
  messagesLoading,
  sendingMessage,
  messageInput,
  setMessageInput,
  onSend,
  messagesEndRef,
  messagesContainerRef,
  onScroll,
  showScrollDown,
  scrollToBottom,
  feedbackState,
  setFeedbackState,
}: {
  messages: ConvMessage[];
  messagesLoading: boolean;
  sendingMessage: boolean;
  messageInput: string;
  setMessageInput: (v: string) => void;
  onSend: (content?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  showScrollDown: boolean;
  scrollToBottom: () => void;
  feedbackState: Record<string | number, FeedbackType>;
  setFeedbackState: React.Dispatch<
    React.SetStateAction<Record<string | number, FeedbackType>>
  >;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // system 메시지는 UI에 표시하지 않음
  const displayMessages = messages.filter((m) => m.role !== "system");
  const aiMessages = displayMessages.filter((m) => m.role === "assistant");
  const lastAiMessageId =
    aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].id : null;

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto"
      >
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {displayMessages.map((msg) => {
              const isLastAi =
                msg.id === lastAiMessageId && !sendingMessage;

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
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="flex items-start gap-3">
                    {/* AI Avatar */}
                    <img
                      src="/ai_profile.jpg"
                      alt="HANSUNG AI"
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
                      <p className="text-xs text-gray-400 mt-1.5">
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Feedback bar – shown after last AI message */}
                  {isLastAi && (
                    <div className="ml-12 mt-1">
                      <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            답변이 도움 되셨나요?
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            더 나은 서비스를 위해 소중한 의견을 반영하겠습니다.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-3">
                          {(
                            [
                              { type: "up" as FeedbackType, Icon: ThumbsUp, activeColor: HANSUNG_SKY },
                              { type: "down" as FeedbackType, Icon: ThumbsDown, activeColor: HANSUNG_SKY },
                              { type: "report" as FeedbackType, Icon: Flag, activeColor: "#ef4444" },
                            ] as const
                          ).map(({ type, Icon, activeColor }) => {
                            const isActive = feedbackState[msg.id] === type;
                            return (
                              <button
                                key={type}
                                onClick={() =>
                                  setFeedbackState((prev) => ({
                                    ...prev,
                                    [msg.id]: prev[msg.id] === type ? null : type,
                                  }))
                                }
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                style={{
                                  backgroundColor: isActive ? activeColor : "#f3f4f6",
                                  color: isActive ? "white" : "#6b7280",
                                }}
                              >
                                <Icon size={14} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading indicator */}
            {sendingMessage && (
              <div className="flex items-start gap-3">
                <img
                  src="/ai_profile.jpg"
                  alt="HANSUNG AI"
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
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute left-1/2 -translate-x-1/2 bottom-28 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
        >
          <ChevronDown size={18} className="text-gray-500" />
        </button>
      )}

      {/* Input area */}
      <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              disabled={sendingMessage}
              rows={2}
              className="w-full px-5 pt-3 pb-10 text-sm text-gray-800 placeholder-gray-400 resize-none outline-none bg-transparent"
            />
            <div className="absolute bottom-2.5 right-3">
              <button
                onClick={() => onSend()}
                disabled={!messageInput.trim() || sendingMessage}
                className="w-9 h-9 text-white rounded-full flex items-center justify-center transition-colors disabled:bg-gray-200"
                style={{
                  backgroundColor:
                    messageInput.trim() && !sendingMessage ? HANSUNG_NAVY : undefined,
                }}
              >
                {sendingMessage ? (
                  <Loader2 size={15} className="animate-spin" />
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
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────

export default function Chat() {
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView] = useState<ViewType>("welcome");
  const [activeNav, setActiveNav] = useState<string>("새 채팅");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const pendingMessageRef = useRef<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [feedbackState, setFeedbackState] = useState<
    Record<string | number, FeedbackType>
  >({});
  const [showArsModal, setShowArsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const trimmedSearch = searchQuery.trim();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  const { data: conversations = [], isLoading: conversationsLoading } =
    trpc.chat.getConversations.useQuery(undefined, { enabled: !!user });

  const { data: searchedConversations = [] } =
    trpc.chat.searchConversations.useQuery(
      { query: trimmedSearch },
      { enabled: !!user && trimmedSearch.length > 0 }
    );

  const trimmedModalSearch = modalSearchQuery.trim();
  const { data: modalSearchedConversations = [] } =
    trpc.chat.searchConversations.useQuery(
      { query: trimmedModalSearch },
      { enabled: !!user && trimmedModalSearch.length > 0 }
    );

  const { data: messages = [], isLoading: messagesLoading } =
    trpc.chat.getMessages.useQuery(
      { conversationId: selectedConversationId! },
      { enabled: !!user && selectedConversationId !== null }
    );

  const createConversation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      utils.chat.getConversations.invalidate();
      setSelectedConversationId(data.id);
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      if (msg) {
        sendMessage.mutate({ conversationId: data.id, content: msg });
      }
    },
    onError: () => {
      toast.error("대화 생성에 실패했습니다");
      setView("welcome");
      setOptimisticMessages([]);
    },
  });

  const startModeConversation = trpc.chat.startModeConversation.useMutation({
    onSuccess: (data) => {
      utils.chat.getConversations.invalidate();
      setSelectedConversationId(data.conversationId);
      setView("chat");
      setActiveNav("");
      setOptimisticMessages([]);
    },
    onError: () => toast.error("대화를 시작하지 못했습니다. 잠시 후 다시 시도해주세요."),
  });

  const deleteConversation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      utils.chat.getConversations.invalidate();
      toast.success("대화가 삭제되었습니다");
    },
    onError: () => toast.error("대화 삭제에 실패했습니다"),
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getMessages.invalidate();
      utils.chat.getConversations.invalidate();
      setOptimisticMessages([]);
    },
    onError: () => {
      toast.error("메시지 전송에 실패했습니다");
      setOptimisticMessages([]);
    },
  });

  useEffect(() => {
    if (view === "chat") {
      const t = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [messages, optimisticMessages, view]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: HANSUNG_NAVY }} />
      </div>
    );
  }

  if (!user) return null;

  // ── Handlers ──

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setView("welcome");
    setActiveNav("새 채팅");
    setOptimisticMessages([]);
  };

  const handleSelectConversation = (id: number) => {
    setSelectedConversationId(id);
    setView("chat");
    setActiveNav("");
    setOptimisticMessages([]);
  };

  const handleDeleteConversation = (id: number) => {
    if (confirm("이 대화를 삭제하시겠습니까?")) {
      deleteConversation.mutate({ conversationId: id });
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
        setView("welcome");
        setActiveNav("새 채팅");
      }
    }
  };

  const handleSendMessage = (content?: string) => {
    const msg = (content !== undefined ? content : messageInput).trim();
    if (!msg) return;
    setMessageInput("");

    setOptimisticMessages([
      {
        id: `temp-${Date.now()}`,
        role: "user",
        content: msg,
        createdAt: new Date(),
      },
    ]);
    setView("chat");
    setActiveNav("");

    if (!selectedConversationId) {
      pendingMessageRef.current = msg;
      createConversation.mutate({ title: msg.slice(0, 50) || "새 대화" });
    } else {
      sendMessage.mutate({ conversationId: selectedConversationId, content: msg });
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredConversations = trimmedSearch
    ? Array.from(
        new Map(
          [
            ...conversations.filter((c) =>
              c.title.toLowerCase().includes(trimmedSearch.toLowerCase())
            ),
            ...searchedConversations,
          ].map((c) => [c.id, c])
        ).values()
      )
    : conversations;

  const allMessages: ConvMessage[] = [
    ...(messages as ConvMessage[]),
    ...optimisticMessages,
  ];

  const isLoading = createConversation.isPending || sendMessage.isPending;

  // ── Sidebar nav items ──

  const navItems = [
    { label: "새 채팅", Icon: SquarePen, action: handleNewChat },
    {
      label: "검색",
      Icon: Search,
      action: () => {
        setModalSearchQuery("");
        setShowSearchModal(true);
      },
    },
    {
      label: "이전 기록",
      Icon: Clock,
      action: () => {
        setView("history");
        setActiveNav("이전 기록");
      },
    },
    {
      label: "공지사항 바로가기",
      Icon: Building2,
      action: () => window.open("https://www.hansung.ac.kr/hansung/6172/subview.do", "_blank"),
    },
    {
      label: "입학안내 바로가기",
      Icon: GraduationCap,
      action: () => window.open("https://enter.hansung.ac.kr/?m1=home", "_blank"),
    },
    { label: "ARS안내", Icon: Phone, action: () => setShowArsModal(true) },
  ];

  // ── Render ──

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200"
        style={{
          width: sidebarCollapsed ? 60 : 200,
          backgroundColor: HANSUNG_NAVY,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-3 flex-shrink-0" style={{ height: 60 }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.8)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "")
            }
          >
            <AlignJustify size={20} />
          </button>
          {!sidebarCollapsed && (
            <span className="text-white font-bold text-[13px] whitespace-nowrap overflow-hidden">
              HANSUNG AI 도우미
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, Icon, action }) => {
            const isActive = activeNav === label;
            return (
              <button
                key={label}
                onClick={() => {
                  setActiveNav(label);
                  action();
                }}
                title={sidebarCollapsed ? label : undefined}
                className="w-full flex items-center gap-3 text-white text-[13px] transition-colors"
                style={{
                  padding: sidebarCollapsed ? "10px 8px" : "10px 12px",
                  borderRadius: sidebarCollapsed ? 10 : 9999,
                  justifyContent: sidebarCollapsed ? "center" : undefined,
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
                }}
              >
                <Icon size={17} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate text-left whitespace-nowrap">{label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="p-3 flex-shrink-0"
          style={{ display: "flex", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}
        >
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.6)" }}
            title="설정"
            onClick={() => user?.role === "admin" && navigate("/admin")}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLButtonElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
            }}
          >
            <Settings size={19} />
          </button>
        </div>
      </aside>

      {/* ── ARS Modal ── */}
      {showArsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowArsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-72"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold mb-4" style={{ color: HANSUNG_NAVY }}>
              전화 안내
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">☎️</span>
                <div>
                  <p className="text-xs text-gray-500 font-medium">ARS안내</p>
                  <p className="text-base font-bold text-gray-800">1544-4113</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">🏫</span>
                <div>
                  <p className="text-xs text-gray-500 font-medium">입학안내</p>
                  <p className="text-base font-bold text-gray-800">02-760-5800</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowArsModal(false)}
              className="mt-4 w-full py-2 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: HANSUNG_NAVY }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ── Search Modal ── */}
      {showSearchModal && (() => {
        const trimmed = modalSearchQuery.trim();
        const modalConversations = trimmed
          ? Array.from(
              new Map(
                [
                  ...conversations.filter((c) =>
                    c.title.toLowerCase().includes(trimmed.toLowerCase())
                  ),
                  ...modalSearchedConversations,
                ].map((c) => [c.id, c])
              ).values()
            )
          : conversations;

        return (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-20"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowSearchModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="대화 내용 검색..."
                  className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                  onKeyDown={(e) => e.key === "Escape" && setShowSearchModal(false)}
                />
                {modalSearchQuery && (
                  <button
                    onClick={() => setModalSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {conversationsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-gray-300" />
                  </div>
                ) : modalConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Clock size={30} className="mb-2 opacity-30" />
                    <p className="text-sm">
                      {trimmed ? "검색 결과가 없습니다" : "대화 기록이 없습니다"}
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {trimmed && (
                      <p className="text-xs text-gray-400 px-2 py-1.5 font-medium">
                        검색 결과 {modalConversations.length}개
                      </p>
                    )}
                    {modalConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          handleSelectConversation(conv.id);
                          setShowSearchModal(false);
                          setModalSearchQuery("");
                        }}
                        className="w-full text-left flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {conv.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(conv.updatedAt).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 ml-2 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  총 {conversations.length}개의 대화
                </p>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex justify-end items-center flex-shrink-0 gap-2 px-4" style={{ height: 56 }}>
          <button
            onClick={() => logout()}
            className="text-white text-sm font-medium rounded-full px-4 py-1.5 transition-colors"
            style={{ backgroundColor: HANSUNG_NAVY }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#162b5e")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = HANSUNG_NAVY)
            }
          >
            로그아웃
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-gray-400 hover:bg-gray-100"
            onClick={() => user?.role === "admin" && navigate("/admin")}
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === "welcome" && (
            <WelcomeView
              onSendMessage={handleSendMessage}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              isLoading={isLoading}
              onNoticeClick={() => startModeConversation.mutate({ mode: "notice" })}
              onAdmissionClick={() => startModeConversation.mutate({ mode: "admission" })}
              isModeLoading={startModeConversation.isPending}
            />
          )}

          {view === "history" && (
            <HistoryView
              conversations={filteredConversations}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isLoading={conversationsLoading}
              onSelect={handleSelectConversation}
              onDelete={handleDeleteConversation}
              selectedId={selectedConversationId}
            />
          )}

          {view === "chat" && (
            <ChatView
              messages={allMessages}
              messagesLoading={messagesLoading}
              sendingMessage={isLoading}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              onSend={handleSendMessage}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
              onScroll={handleScroll}
              showScrollDown={showScrollDown}
              scrollToBottom={scrollToBottom}
              feedbackState={feedbackState}
              setFeedbackState={setFeedbackState}
            />
          )}
        </div>
      </main>
    </div>
  );
}
