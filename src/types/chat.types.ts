import type { User } from "./user.types";
import type { NotificationItem } from "../components/common/NotificationDropdown";

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
  };
  conversationId: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group" | "myself";
  metadata: {
    name: string;
  };
  participants: Array<{
    userId: string;
    username: string;
  }>;
  lastMessage?: Message;
}

export interface CreateConversationData {
  type: "direct" | "group";
  participantIds: string[];
  groupName?: string;
}

export interface SendMessageData {
  conversationId: string;
  content: string;
}

export interface ChatContextType {
  conversations: Conversation[];
  selectedConversation: string | null;
  messages: Message[];
  users: User[];
  selectConversation: (id: string) => void;
  createConversation: (data: CreateConversationData) => Promise<void>;
  sendMessage: (data: SendMessageData) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadUsers: () => Promise<void>;
  sendFriendRequest: (userId: string, username: string) => Promise<void>;
  acceptFriendRequest: (senderId: string, senderUsername: string) => Promise<void>;
  denyFriendRequest: (senderId: string, senderUsername: string) => Promise<void>;
  notifications: NotificationItem[];
  addParticipants: (conversationId: string, participantIds: string[]) => Promise<void>;
}

export interface WebSocketMessage<T> {
  type: "new_message" | "new_conversation" | "user_online" | "user_offline";
  data: T;
}
