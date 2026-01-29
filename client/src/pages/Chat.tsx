import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, MessageSquare, Plus, Search, Trash2, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

export default function Chat() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      toast.success(t("chat_created"));
    },
    onError: () => {
      toast.error(t("chat_creation_failed"));
    },
  });

  // Delete conversation mutation
  const deleteConversation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      utils.conversations.list.invalidate();
      setSelectedConversationId(null);
      toast.success(t("chat_deleted"));
    },
    onError: () => {
      toast.error(t("chat_deletion_failed"));
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
      toast.error(t("message_send_failed"));
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
    const title = t("new_chat");
    createConversation.mutate({ title });
  };

  const handleDeleteConversation = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("delete_confirmation"))) {
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
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } border-r border-border bg-card flex flex-col transition-all duration-300 overflow-hidden relative`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between mb-4">
            <img src="/bumjin-logo.png" alt="BumJin" className="h-8" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="flex-shrink-0 hover:bg-primary/10"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-foreground">{t("chat_history")}</h1>
            <Button onClick={handleNewConversation} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              {t("new_chat")}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("search_chat")}
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
                {searchQuery ? t("no_search_results") : t("no_conversations")}
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
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary/10"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{conv.title}</p>
                    <p className="text-xs opacity-70">
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

        {/* Bottom Section - Language & User Info & Logout */}
        <div className="border-t border-border flex-shrink-0 space-y-3 p-4">
          {/* Language Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("language")}</span>
            <LanguageSwitch />
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* User Info & Logout Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="flex-shrink-0 px-3"
            >
              {t("logout")}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Toggle Button */}
        <div className="border-b border-border bg-card p-4 flex items-center gap-2">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="flex-shrink-0 hover:bg-primary/10"
              title="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
        </div>

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
                  <h2 className="text-xl font-semibold mb-2 text-foreground">{t("start_conversation")}</h2>
                  <p className="text-muted-foreground">{t("start_conversation_desc")}</p>
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
                  placeholder={t("message_placeholder")}
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
                  {t("send")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-foreground">
                {user?.name}{t("welcome")}
              </h2>
              <p className="text-muted-foreground mb-6">{t("select_or_create")}</p>
              <Button onClick={handleNewConversation} className="gap-2">
                <Plus className="w-4 h-4" />
                {t("start_new_chat")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
