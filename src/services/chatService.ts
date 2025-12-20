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
          let mappedLastMessage: Message | undefined = undefined;
          if (lastMessage) {
            mappedLastMessage = {
              id: lastMessage.id,
              message: lastMessage.message || lastMessage.content || '',
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
              id: p.userId,
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
      message: item.message || item.content,
      sender: item.sender,
      conversationId: item.conversationId,
      createdAt: new Date().toISOString() // Backend doesn't return time
    }));
  },

  async createConversation(conversationData: {
    type: string;
    metadata: { name: string };
    creator: { id: string; username: string };
    participants: { id: string; username: string }[];
  }): Promise<Conversation> {
    const data = await apiClient.post("/conversation", {
      conversation: {
        type: conversationData.type,
        metadata: conversationData.metadata,
      },
      participants: conversationData.participants,
    });

    // Check if backend returns the full mapped structure or just the DB record
    // Assuming we need to return a Conversation object, we might need to cast or map `data`
    // For now assuming data matches `GetConversationRepositoryOutput` or similar
    // We will stick to returning 'any' cast to Conversation or simplistic mapping if needed.
    // Based on `createConversationController`, it returns `CreateConversationRepositoryOutput` keys: `conversation`, `participants`.

    return {
      id: data.conversation.id,
      type: data.conversation.type,
      metadata: data.conversation.metadata,
      participants: data.participants.map((p: any) => ({
        id: p.userId,
        username: p.username
      })),
    };
  },

  async sendMessage(messageData: {
    conversationId: string;
    sender: { id: string; username: string };
    message: string;
  }): Promise<Message> {
    const data = await apiClient.post("/conversation/message", {
      conversationId: messageData.conversationId,
      sender: messageData.sender,
      message: messageData.message
    });

    // Backend returns { code, message: string } (success message), NOT the created message object in the response body of `handleSendMessage`.
    // Wait, `sendMessageController` returns `ResponseDomain`.
    // The previous implementation expected the created message back.
    // If backend doesn't return the message, we have to simulate it for the UI to update optimistically or re-fetch.

    return {
      id: "temp-" + Date.now(),
      message: messageData.message,
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
    // When accepting/denying, 'we' are the sender of this action, and the original sender is the 'recipient' of this action via query params
    await apiClient.post(`/notification/friend/${action}?id=${targetUserId}&username=${targetUsername}`, {});
  },



  async addParticipants(data: {
    conversationId: string;
    creator: { id: string; username: string };
    participants: { id: string; username: string }[];
  }): Promise<void> {
    await apiClient.post("/conversation/participants", data);
  },
};
