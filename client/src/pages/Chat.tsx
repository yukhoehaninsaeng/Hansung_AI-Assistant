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
  LogOut,
  Phone,
  Search,
  Settings,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  X,        // ★ 추가
  Pencil,   // ★ 추가
  Check,    // ★ 추가
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

// ─── ProfileModal ─────────────────────────────────────────────────────────────
// ★ 추가: 프로필 모달 컴포넌트

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { data: profile, isLoading, refetch } = trpc.user.getMe.useQuery();
  const updateEmail = trpc.user.updateEmail.useMutation({
    onSuccess: () => {
      toast.success("이메일이 수정되었습니다");
      setEditingEmail(false);
      refetch();
    },
    onError: () => toast.error("이메일 수정에 실패했습니다"),
  });

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const handleEditStart = () => {
    setEmailInput(profile?.email ?? "");
    setEditingEmail(true);
  };

  const handleEmailSave = () => {
    if (!emailInput.trim()) return;
    updateEmail.mutate({ email: emailInput.trim() });
  };

  const fields = [
    { label: "아이디", value: profile?.username, editable: false },
    { label: "이름", value: profile?.name, editable: false },
    { label: "학번", value: profile?.studentId, editable: false },
    { label: "학과", value: profile?.department, editable: false },
    { label: "역할", value: profile?.role === "admin" ? "관리자" : "학생", editable: false },
    { label: "이메일", value: profile?.email, editable: true },
  ];

  const userInitials = (profile?.name || profile?.username || "?")
    .split(" ")
    .map((w: string) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="relative flex flex-col items-center pt-8 pb-6 px-6"
          style={{ background: `linear-gradient(135deg, ${HANSUNG_NAVY} 0%, #2a4a9f 100%)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <X size={14} />
          </button>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3 shadow-lg"
            style={{ backgroundColor: "#f97316" }}
          >
            {userInitials}
          </div>
          <p className="text-white font-bold text-lg leading-tight">
            {profile?.name || profile?.username || "-"}
          </p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            {profile?.role === "admin" ? "관리자" : "학생"}
          </p>
        </div>

        {/* 필드 목록 */}
        <div className="px-6 py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : (
            fields.map(({ label, value, editable }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
                {editable && editingEmail ? (
                  // 이메일 편집 모드
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEmailSave();
                        if (e.key === "Escape") setEditingEmail(false);
                      }}
                      className="flex-1 text-sm px-3 py-1.5 border rounded-lg outline-none transition-colors"
                      style={{ borderColor: HANSUNG_SKY }}
                    />
                    <button
                      onClick={handleEmailSave}
                      disabled={updateEmail.isPending}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: HANSUNG_SKY }}
                    >
                      {updateEmail.isPending
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Check size={12} />
                      }
                    </button>
                    <button
                      onClick={() => setEditingEmail(false)}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  // 일반 표시 모드
                  <div className="flex items-center justify-between group">
                    <p className="text-sm text-gray-800 font-medium">
                      {value || <span className="text-gray-400">-</span>}
                    </p>
                    {editable && (
                      <button
                        onClick={handleEditStart}
                        className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                )}
                <div className="h-px bg-gray-100 mt-3" />
              </div>
            ))
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: HANSUNG_NAVY }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

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

        {/* Main content */}
        {/* 26.04.06 수정: 로고 이미지 추가, h1/서브타이틀 폰트·색상 지정, gap 직접 지정 */}
        <div className="relative z-10 flex flex-col items-center text-center" style={{ gap: 0 }}>
          <img src="/logo.png" alt="logo" style={{ marginBottom: 30 }} />
          <h1 style={{ fontSize: 30, fontWeight: 800, fontFamily: 'Pretendard', letterSpacing: '-0.02em' }}>
            <span style={{ color: HANSUNG_NAVY }}>한성대학교</span>{" "}
            <span style={{ color: HANSUNG_SKY }}>AI 도우미</span>
          </h1>
          <p style={{ marginTop: -2, fontSize: 26, fontWeight: 500, fontFamily: 'Pretendard', color: '#000000' }}>안녕하세요, 무엇을 도와드릴까요?</p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 mt-5 w-full max-w-xl">
            {/* 26.04.06 수정: 카드 디자인 변경 - 회색 배경 + 흰색 내용 박스 */}
            {/* 공지사항 card */}
            <button
              onClick={onNoticeClick}
              disabled={isModeLoading}
              className="p-4 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#EEF2F7", borderRadius: 12 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: HANSUNG_SKY }}
                >
                  {isModeLoading ? <Loader2 size={14} className="text-white animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="-2 -3 28 28"><path fill="#fff" d="M12.04 2.5L9.53 5h5zM4 7v13h16V7zm8-7l5 5h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3zM7 18v-4h5v4zm7-1v-7h4v7zm-8-5V9h5v3z"/></svg>}
                </div>
                <span className="font-bold flex items-center gap-0.5" style={{ color: HANSUNG_NAVY, fontSize: 17 }}>
                  공지사항 <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </span>
              </div>
              <div className="bg-white px-3 py-2.5" style={{ borderRadius: 4 }}>
                <p className="text-xs text-gray-500 leading-relaxed">
                  복잡하고 보기 어려운 공지사항을,
                  <br />
                  원하는 정보만 물어보면 바로 확인할 수 있어요.
                </p>
              </div>
            </button>

            {/* 입학 안내 card */}
            <button
              onClick={onAdmissionClick}
              disabled={isModeLoading}
              className="p-4 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#EEF2F7", borderRadius: 12 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: HANSUNG_SKY }}
                >
                  {isModeLoading ? <Loader2 size={14} className="text-white animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="-2 -2 28 28"><path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 20v-9l-4 1.125V20zm0 0h8m-8 0V6.667M16 20v-9l4 1.125V20zm0 0V6.667M18 8l-6-4l-6 4m5 1h2m-2 3h2"/></svg>}
                </div>
                <span className="font-bold flex items-center gap-0.5" style={{ color: HANSUNG_NAVY, fontSize: 17 }}>
                  입학 안내 <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </span>
              </div>
              <div className="bg-white px-3 py-2.5" style={{ borderRadius: 4 }}>
                <p className="text-xs text-gray-500 leading-relaxed">
                  신입생 입학에 필요한 모든 절차와 경쟁률,
                  <br />
                  주요 일정까지 한 번에 손쉽게 안내해 드립니다.
                </p>
              </div>
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
        {/* 26.04.06 수정: 전송 버튼 SVG 아이콘 교체, 배경색 #333333 */}
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
              className="w-9 h-9 text-white rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: '#333333' }}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 12l-.604-5.437C4.223 5.007 5.825 3.864 7.24 4.535l11.944 5.658c1.525.722 1.525 2.892 0 3.614L7.24 19.466c-1.415.67-3.017-.472-2.844-2.028zm0 0h7"/></svg>
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
                    {/* 26.04.06 수정: rounded-2xl → rounded-lg */}
                    <div className="bg-gray-800 text-white text-sm px-4 py-3 rounded-lg max-w-[70%] whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="flex items-start gap-3">
                    {/* 26.04.06 수정: AI 프로필 이미지 bugi_obj.png로 변경 */}
                    <img
                      src="/bugi_obj.png"
                      alt="HANSUNG AI"
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">
                        HANSUNG AI 도우미
                      </p>
                      {/* 26.04.06 수정: rounded-2xl → rounded-lg */}
                      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm inline-block max-w-[85%]">
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
                      <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm">
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
                {/* 26.04.06 수정: 로딩 말풍선 AI 프로필 이미지 bugi_obj.png로 변경 */}
                <img
                  src="/bugi_obj.png"
                  alt="HANSUNG AI"
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    HANSUNG AI 도우미
                  </p>
                  {/* 26.04.06 수정: 로딩 말풍선 배경 #E5F3FF, 패딩 상하20/좌우30, loading01.gif 크기 80px */}
                  <div className="rounded-lg shadow-sm" style={{ backgroundColor: "#E5F3FF", paddingTop: 20, paddingBottom: 20, paddingLeft: 30, paddingRight: 30 }}>
                    <img src="/loading01.gif" alt="loading" style={{ width: 80, objectFit: "contain" }} />
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
                className="w-9 h-9 text-white rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor:
                    messageInput.trim() && !sendingMessage ? HANSUNG_NAVY : undefined,
                }}
              >
                {sendingMessage ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 12l-.604-5.437C4.223 5.007 5.825 3.864 7.24 4.535l11.944 5.658c1.525.722 1.525 2.892 0 3.614L7.24 19.466c-1.415.67-3.017-.472-2.844-2.028zm0 0h7"/></svg>
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false); // ★ 추가

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const trimmedSearch = searchQuery.trim();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  // trpc 쿼리 및 뮤테이션 정의 - 대화 목록, 검색된 대화, 모달 검색된 대화, 메시지 목록 가져오기
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

  // ── User helpers ──

  const userDisplayName = user.name || user.username || "사용자";
  const userInitials = userDisplayName
    .split(" ")
    .map((w: string) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userRoleLabel = user.role === "admin" ? "관리자" : "학생";

  // ── Sidebar nav items ──

  // 26.04.06 수정: 사이드바 nav 아이콘 SVG로 교체, 메뉴 글자 크기 15px, 사이드바 width 270px
  const navItems = [
    { label: "새 채팅", Icon: SquarePen, svgIcon: null, action: handleNewChat },
    {
      label: "검색",
      Icon: Search,
      svgIcon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path fill="#fff" fillRule="evenodd" d="M8 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8M2 8a6 6 0 1 1 10.89 3.476l4.817 4.817a1 1 0 0 1-1.414 1.414l-4.816-4.816A6 6 0 0 1 2 8" clipRule="evenodd"/></svg>,
      action: () => {
        setModalSearchQuery("");
        setShowSearchModal(true);
      },
    },
    {
      label: "이전 기록",
      Icon: Clock,
      svgIcon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M13.26 3C8.17 2.86 4 6.95 4 12H2.21c-.45 0-.67.54-.35.85l2.79 2.8c.2.2.51.2.71 0l2.79-2.8a.5.5 0 0 0-.36-.85H6c0-3.9 3.18-7.05 7.1-7c3.72.05 6.85 3.18 6.9 6.9c.05 3.91-3.1 7.1-7 7.1c-1.61 0-3.1-.55-4.28-1.48a.994.994 0 0 0-1.32.08c-.42.42-.39 1.13.08 1.49A8.86 8.86 0 0 0 13 21c5.05 0 9.14-4.17 9-9.26c-.13-4.69-4.05-8.61-8.74-8.74m-.51 5c-.41 0-.75.34-.75.75v3.68c0 .35.19.68.49.86l3.12 1.85c.36.21.82.09 1.03-.26c.21-.36.09-.82-.26-1.03l-2.88-1.71v-3.4c0-.4-.34-.74-.75-.74"/></svg>,
      action: () => {
        setView("history");
        setActiveNav("이전 기록");
      },
    },
    {
      label: "공지사항 바로가기",
      Icon: Building2,
      svgIcon: <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24"><path fill="#fff" d="M12.04 2.5L9.53 5h5zM4 7v13h16V7zm8-7l5 5h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3zM7 18v-4h5v4zm7-1v-7h4v7zm-8-5V9h5v3z"/></svg>,
      action: () => window.open("https://www.hansung.ac.kr/hansung/6172/subview.do", "_blank"),
    },
    {
      // 26.04.08 수정: 입학안내 링크 수정
      label: "입학안내 바로가기",
      Icon: GraduationCap,
      svgIcon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M8 20v-9l-4 1.125V20zm0 0h8m-8 0V6.667M16 20v-9l4 1.125V20zm0 0V6.667M18 8l-6-4l-6 4m5 1h2m-2 3h2"/></svg>,
      action: () => window.open("https://enter.hansung.ac.kr/?m1=home", "_blank"),
    },
    {
      label: "ARS안내",
      Icon: Phone,
      svgIcon: <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2m10 3a2 2 0 0 1 2 2m-2-6a6 6 0 0 1 6 6"/></svg>,
      action: () => setShowArsModal(true),
    },
  ];

  // ── Render ──

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ★ 추가: 프로필 모달 */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-hidden transition-all duration-270"
        style={{
          width: sidebarCollapsed ? 60 : 270,
          backgroundColor: HANSUNG_NAVY,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 flex-shrink-0" style={{ height: 60 }}>
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
          {/* 26.04.06 수정: HANSUNG #ffffff, AI 도우미 #4899FF 색상 분리 */}
          {!sidebarCollapsed && (
            <span className="font-bold text-[16px] whitespace-nowrap overflow-hidden" style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--spacing) * 1)' }}>
              <span style={{ color: '#ffffff' }}>HANSUNG</span><span style={{ color: '#4899FF' }}>AI 도우미</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, Icon, svgIcon, action }) => {
            const isActive = activeNav === label;
            return (
              <button
                key={label}
                onClick={() => {
                  setActiveNav(label);
                  action();
                }}
                title={sidebarCollapsed ? label : undefined}
                className="w-full flex items-center gap-3 text-white text-[15px] transition-colors"
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
                {/* 26.04.06 수정: svgIcon 우선, 없으면 lucide Icon */}
                {svgIcon
                  ? <span className="flex-shrink-0">{svgIcon}</span>
                  : <Icon size={17} className="flex-shrink-0" />
                }
                {!sidebarCollapsed && (
                  <span className="truncate text-left whitespace-nowrap">{label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer – User profile */}
        <div className="p-2 flex-shrink-0 relative">
          {/* User menu popup */}
          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              {/* Menu card */}
              <div
                className="absolute z-50 bg-white rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  bottom: "calc(100% + 8px)",
                  left: sidebarCollapsed ? 60 : 8,
                  right: sidebarCollapsed ? "auto" : 8,
                  width: sidebarCollapsed ? 200 : undefined,
                  minWidth: 180,
                }}
              >
                {/* User info header */}
                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: "#f97316" }}
                  >
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{userDisplayName}</p>
                    <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  {/* ★ 수정: 프로필 클릭 → showProfileModal = true */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <User size={15} className="flex-shrink-0 text-gray-400" />
                    프로필
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (user?.role === "admin") navigate("/admin");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Settings size={15} className="flex-shrink-0 text-gray-400" />
                    설정
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut size={15} className="flex-shrink-0" />
                    로그아웃
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Avatar button */}
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            title={sidebarCollapsed ? userDisplayName : undefined}
            className="w-full flex items-center gap-2.5 rounded-xl transition-colors"
            style={{
              padding: sidebarCollapsed ? "8px" : "8px 10px",
              justifyContent: sidebarCollapsed ? "center" : undefined,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "")
            }
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: "#f97316" }}
            >
              {userInitials}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-white text-xs font-semibold truncate leading-tight">
                  {userDisplayName}
                </p>
                <p className="text-xs truncate leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {userRoleLabel}
                </p>
              </div>
            )}
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
          {/* 26.04.06 수정: 로그아웃 버튼 배경색 #111111 */}
          <button
            onClick={() => logout()}
            className="text-white text-sm font-medium rounded-full px-4 py-1.5 transition-colors"
            style={{ backgroundColor: '#111111' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#333333")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111111')
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