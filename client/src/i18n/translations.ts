export type Language = "KR" | "EN";

export const translations = {
  KR: {
    // Sidebar
    chat_history: "채팅기록",
    new_chat: "새 대화",
    search_chat: "대화 검색...",
    logout: "로그아웃",
    language: "언어",
    
    // Main area
    start_conversation: "대화를 시작하세요",
    start_conversation_desc: "아래에 메시지를 입력하여 대화를 시작할 수 있습니다.",
    start_new_chat: "새 대화 시작",
    
    // Messages
    message_placeholder: "메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)",
    send: "전송",
    
    // States
    loading: "로딩 중...",
    error: "오류가 발생했습니다",
    no_conversations: "대화가 없습니다",
    no_search_results: "검색 결과가 없습니다",
    
    // Confirmations
    delete_confirmation: "이 대화를 삭제하시겠습니까?",
    chat_created: "새 대화가 생성되었습니다",
    chat_deleted: "대화가 삭제되었습니다",
    chat_creation_failed: "대화 생성에 실패했습니다",
    chat_deletion_failed: "대화 삭제에 실패했습니다",
    message_send_failed: "메시지 전송에 실패했습니다",
    
    // Welcome
    welcome: "님, 환영합니다!",
    select_or_create: "좌측에서 대화를 선택하거나 새 대화를 시작하세요.",
  },
  EN: {
    // Sidebar
    chat_history: "Chat History",
    new_chat: "New Chat",
    search_chat: "Search chats...",
    logout: "Logout",
    language: "Language",
    
    // Main area
    start_conversation: "Start a Conversation",
    start_conversation_desc: "You can start a conversation by typing a message below.",
    start_new_chat: "Start New Chat",
    
    // Messages
    message_placeholder: "Type a message... (Enter: send, Shift+Enter: new line)",
    send: "Send",
    
    // States
    loading: "Loading...",
    error: "An error occurred",
    no_conversations: "No conversations",
    no_search_results: "No search results",
    
    // Confirmations
    delete_confirmation: "Are you sure you want to delete this conversation?",
    chat_created: "New chat created",
    chat_deleted: "Chat deleted",
    chat_creation_failed: "Failed to create chat",
    chat_deletion_failed: "Failed to delete chat",
    message_send_failed: "Failed to send message",
    
    // Welcome
    welcome: ", welcome!",
    select_or_create: "Select a conversation on the left or start a new one.",
  },
};

export const getTranslation = (lang: Language, key: keyof typeof translations.KR): string => {
  return translations[lang][key] || translations.KR[key];
};
