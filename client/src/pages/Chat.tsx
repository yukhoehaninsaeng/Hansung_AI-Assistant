import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

export default function Chat() {
  const { user, logout } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
  }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = trpc.conversations.list.useQuery();

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = trpc.messages.list.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: selectedConversationId !== null }
  );

  // Create conversation mutation
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: (data) => {
      utils.conversations.list.invalidate();
      setSelectedConversationId(data.id);
      toast.success("새 대화가 생성되었습니다");
    },
    onError: () => {
      toast.error("대화 생성에 실패했습니다");
    },
  });

  // Delete conversation mutation
  const deleteConversation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      utils.conversations.list.invalidate();
      setSelectedConversationId(null);
      toast.success("대화가 삭제되었습니다");
    },
    onError: () => {
      toast.error("대화 삭제에 실패했습니다");
    },
  });

  // Send message mutation
  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.messages.list.invalidate();
      utils.conversations.list.invalidate();
      setOptimisticMessages([]);
    },
    onError: () => {
      toast.error("메시지 전송에 실패했습니다");
      setOptimisticMessages([]);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, optimisticMessages]);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewConversation = () => {
    const title = "새 대화";
    createConversation.mutate({ title });
  };

  const handleDeleteConversation = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("이 대화를 삭제하시겠습니까?")) {
      deleteConversation.mutate({ id });
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    const content = messageInput.trim();
    setMessageInput("");

    // Optimistic UI update
    const optimisticId = `temp-${Date.now()}`;
    setOptimisticMessages([
      {
        id: optimisticId,
        role: "user",
        content,
        createdAt: new Date(),
      },
    ]);

    sendMessage.mutate({
      conversationId: selectedConversationId,
      content,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const allMessages = [...messages, ...optimisticMessages];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-foreground">채팅</h1>
            <Button onClick={handleNewConversation} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              새 대화
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="대화 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "대화가 없습니다"}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                    selectedConversationId === conv.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user?.name || "사용자"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : allMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2 text-foreground">대화를 시작하세요</h2>
                  <p className="text-muted-foreground">아래에 메시지를 입력하여 대화를 시작할 수 있습니다.</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {allMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-card-foreground"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <Streamdown>{msg.content}</Streamdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {sendMessage.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-2xl px-4 py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border bg-card p-4">
              <div className="max-w-4xl mx-auto flex gap-3">
                <Input
                  placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendMessage.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessage.isPending}
                >
                  전송
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-foreground">
                {user?.name ? `${user.name}님, 환영합니다!` : "환영합니다!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                좌측에서 대화를 선택하거나 새 대화를 시작하세요.
              </p>
              <Button onClick={handleNewConversation} className="gap-2">
                <Plus className="w-4 h-4" />
                새 대화 시작
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
