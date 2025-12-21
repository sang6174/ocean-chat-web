import { apiClient } from "./api";
import type { User } from "../types/user.types";
import type { Conversation, Message } from "../types/chat.types";

export const chatService = {
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const data = await apiClient.get(`/conversations?userId=${userId}`);
      console.log('API /conversations response:', data);

      if (!Array.isArray(data)) {
        console.warn('API returned non-array for conversations:', data);
        return [];
      }

      return data.map((item: any) => {
        try {
          // Backend returns { conversation: {...}, participants: [...], messages: [...] }
          if (!item.conversation) {
            console.warn('Missing conversation object in item:', item);
            return null;
          }

          const lastMessage = item.messages && item.messages.length > 0
            ? item.messages[item.messages.length - 1]
            : undefined;

          // Map backend message format to frontend Message
          // Backend /conversations returns messages with 'content'
          let mappedLastMessage: Message | undefined = undefined;
          if (lastMessage) {
            mappedLastMessage = {
              id: lastMessage.id,
              content: lastMessage.content || lastMessage.message || '',
              sender: lastMessage.sender || { id: 'unknown', username: 'Unknown' },
              conversationId: lastMessage.conversationId,
              createdAt: new Date().toISOString()
            };
          }

          return {
            id: item.conversation.id,
            type: item.conversation.type,
            metadata: item.conversation.metadata || {},
            participants: (item.participants || []).map((p: any) => ({
              userId: p.userId,
              username: p.username || "User " + (p.userId ? p.userId.substr(0, 4) : "Unknown")
            })),
            lastMessage: mappedLastMessage
          };
        } catch (err) {
          console.error('Error mapping conversation item:', err, item);
          return null;
        }
      }).filter(Boolean) as Conversation[]; // Filter out nulls

    } catch (error) {
      console.error('getConversations service error:', error);
      return [];
    }
  },

  async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const data = await apiClient.get(
      `/conversations/messages?conversationId=${conversationId}&limit=${limit}&offset=${offset}`
    );

    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: item.id,
      content: item.message || item.content, // Backend /messages returns 'message'
      sender: item.sender,
      conversationId: item.conversationId,
      createdAt: new Date().toISOString() // Backend doesn't return time
    }));
  },

  async createConversation(conversationData: {
    type: string;
    metadata: { name: string };
    creator: { id: string; username: string };
    participants: { userId: string; username: string }[];
  }): Promise<Conversation> {
    const data = await apiClient.post("/conversation", {
      conversation: {
        type: conversationData.type,
        metadata: conversationData.metadata,
      },
      participants: conversationData.participants.map(p => ({
        id: p.userId, // Backend expects 'id' in participants array for creation, likely
        username: p.username
      })),
    });

    // Backend returns { conversation: {...}, participants: [...] }
    return {
      id: data.conversation.id,
      type: data.conversation.type,
      metadata: data.conversation.metadata,
      participants: data.participants.map((p: any) => ({
        userId: p.userId,
        username: p.username
      })),
    };
  },

  async sendMessage(messageData: {
    conversationId: string;
    sender: { id: string; username: string };
    content: string;
  }): Promise<Message> {
    await apiClient.post("/conversation/message", {
      conversationId: messageData.conversationId,
      sender: messageData.sender,
      message: messageData.content // Backend expects 'message' in body
    });

    // Backend doesn't return the message object on success
    return {
      id: "temp-" + Date.now(),
      content: messageData.content,
      sender: messageData.sender,
      conversationId: messageData.conversationId,
      createdAt: new Date().toISOString()
    };
  },

  async getUsers(): Promise<User[]> {
    const data = await apiClient.get("/profile/users");
    // Ensure data is array before returning
    return Array.isArray(data) ? data : (data.users || []); // Handle potential wrapper
  },

  async getUser(userId: string): Promise<User> {
    const data = await apiClient.get(`/profile/user?userId=${userId}`);
    return data;
  },

  async sendFriendRequest(userId: string, username: string): Promise<void> {
    await apiClient.post(`/notification/friend?id=${userId}&username=${username}`, {});
  },

  async responseFriendRequest(
    targetUserId: string,
    targetUsername: string,
    action: 'accept' | 'deny'
  ): Promise<void> {
    await apiClient.post(`/notification/friend/${action}?id=${targetUserId}&username=${targetUsername}`, {});
  },

  async addParticipants(data: {
    conversationId: string;
    creator: { id: string; username: string };
    participants: { userId: string; username: string }[];
  }): Promise<void> {
    await apiClient.post("/conversation/participants", {
      ...data,
      participants: data.participants.map(p => ({
        id: p.userId,
        username: p.username
      }))
    });
  },
};
