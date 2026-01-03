import type { User } from "./user.types";


export interface NotificationItem {
  id: string; // Unique ID for the notification in UI state
  type: 'friend_request' | 'accept_friend_request' | 'deny_friend_request';
  sender: {
    id: string;
    username: string;
  };
  recipient: {
    id: string;
    username: string;
  };
  content: string; // Notification message from backend
  timestamp: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  isRead: boolean;
}


export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
  };
  conversationId: string;
  createdAt?: string;
  // type: 'text' | 'image'; // Backend doesn't seem to have type yet, defaulting to text logic implies content
}

export interface Conversation {
  id: string;
  type: "direct" | "group" | "myself";
  name: string; // Backend has name directly, not in metadata
  creatorId: string; // Backend has creator object, but for UI list we might just need ID or full object. Let's keep it simple or align with backend 'creator' object if needed.
  // Backend Conversation has: id, type, name, lastEvent, creator { id, username }
  creator: {
    id: string;
    username: string;
  };
  participants: Array<{
    userId: string;
    username: string;
    role: string;
  }>;
  lastMessage?: Message;
}

export interface CreateConversationData {
  type: "direct" | "group";
  participantIds: string[];
  name?: string; // Changed from groupName to name to match backend logic generically, or mapped
}

export interface SendMessageData {
  conversationId: string;
  content: string; // Backend calls it 'message' in some places, 'content' in others. Service maps it.
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
  cancelFriendRequest: (notificationId: string, userId: string, username: string) => Promise<void>;
  acceptFriendRequest: (senderId: string, senderUsername: string) => Promise<void>;
  denyFriendRequest: (senderId: string, senderUsername: string) => Promise<void>;
  unfriend: (userId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  notifications: NotificationItem[];
  allNotifications: NotificationItem[]; // All notifications involving user (for AddFriendModal)
  addParticipants: (conversationId: string, participantIds: string[]) => Promise<void>;
}

export interface WebSocketMessage<T> {
  type: "new_message" | "new_conversation" | "user_online" | "user_offline";
  data: T;
}
