
import { apiClient } from "./api";
import type { User } from "../types/user.types";
import type { Conversation, Message } from "../types/chat.types";
import type {
  GetConversationsResponseItem,
  GetMessagesResponseItem,
  GetNotificationResponse,
} from "../types/backend.types";
import { NotificationType } from "../types/backend.types";
import type { NotificationItem } from "../types/chat.types";

export const chatService = {
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      // API returns GetConversationsResponseItem[]
      const data = await apiClient.get(`/v1/conversations?userId=${userId}`);

      if (!Array.isArray(data)) {
        console.warn('API returned non-array for conversations:', data);
        return [];
      }

      return data.map((item: GetConversationsResponseItem) => {
        try {
          if (!item.conversation) return null;

          const lastBackendMessage = item.messages && item.messages.length > 0
            ? item.messages[item.messages.length - 1]
            : undefined;

          let lastMessage: Message | undefined = undefined;

          if (lastBackendMessage) {
            // Backend "GetConversations" messages only have senderId.
            // We verify who the sender is from participants.
            const senderParticipant = item.participants.find(p => p.user.id === lastBackendMessage.senderId);

            lastMessage = {
              id: lastBackendMessage.id,
              content: lastBackendMessage.content,
              conversationId: item.conversation.id,
              sender: lastBackendMessage.senderId ? {
                id: lastBackendMessage.senderId,
                username: senderParticipant ? (senderParticipant.user.username && senderParticipant.user.username !== 'Unknown' ? senderParticipant.user.username : (senderParticipant.user.name || senderParticipant.user.email || 'Unknown')) : 'Unknown'
              } : {
                id: '', // System message
                username: 'System'
              },
              createdAt: undefined // Not in backend DTO for this endpoint
            };
          }

          const conversation: Conversation = {
            id: item.conversation.id,
            type: item.conversation.type,
            name: item.conversation.name,
            creatorId: item.conversation.creator.id,
            creator: {
              id: item.conversation.creator.id,
              username: item.conversation.creator.username
            },
            participants: item.participants.map(p => ({
              userId: p.user.id,
              username: p.user.username && p.user.username !== 'Unknown' ? p.user.username : (p.user.name || p.user.email || 'Unknown'),
              role: p.role
            })),
            lastMessage
          };
          return conversation;
        } catch (err) {
          console.error('Error mapping conversation item:', err, item);
          return null;
        }
      }).filter(Boolean) as Conversation[];

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
    // Returns GetMessagesResponseItem[]
    const data = await apiClient.get(
      `/v1/conversation/messages?conversationId=${conversationId}&limit=${limit}&offset=${offset}`
    );

    if (!Array.isArray(data)) return [];

    return data.map((item: GetMessagesResponseItem) => ({
      id: item.id,
      content: item.message, // Backend maps 'content' to 'message' in this endpoint
      sender: item.sender ? {
        id: item.sender.id,
        username: item.sender.username
      } : {
        id: '', // System message has no sender
        username: 'System'
      },
      conversationId: item.conversationId,
      createdAt: new Date().toISOString() // Backend doesn't return date yet
    }));
  },

  async createConversation(conversationData: {
    type: string;
    participants: { userId: string }[];
    name?: string;
  }): Promise<any> {
    const response = await apiClient.post("/v1/conversation/group", {
      conversation: {
        name: conversationData.name || "New Conversation",
      },
      participantIds: conversationData.participants.map(p => p.userId),
    });
    return response;
  },

  async sendMessage(messageData: {
    conversationId: string;
    sender: { id: string; username: string };
    content: string;
  }): Promise<void> {
    await apiClient.post("/v1/conversation/message", {
      conversationId: messageData.conversationId,
      message: messageData.content
    });
  },

  async getUsers(): Promise<User[]> {
    const data = await apiClient.get("/v1/profile/users");
    // Returns GetProfileUserDomainOutput[] -> User & {username}
    return Array.isArray(data) ? data : [];
  },

  async getUser(userId: string): Promise<User> {
    const data = await apiClient.get(`/v1/profile/user?userId=${userId}`);
    return data;
  },

  async sendFriendRequest(userId: string, username: string): Promise<void> {
    await apiClient.post(`/v1/notification/friend-request`, {
      recipient: {
        id: userId,
        username: username
      }
    });
  },

  // Get ALL notifications involving the user (as sender OR recipient)
  // Used by AddFriendModal to check relationship status
  async getAllNotificationsForUser(currentUserId: string): Promise<NotificationItem[]> {
    const data = await apiClient.get('/v1/notifications');

    if (!Array.isArray(data)) return [];

    let rawNotifications = data as GetNotificationResponse[];
    if (rawNotifications.length === 0) return [];

    // Filter to get notifications where user is EITHER sender OR recipient
    rawNotifications = rawNotifications.filter(n =>
      n.senderId === currentUserId || n.recipientId === currentUserId
    );

    // Extract unique user IDs that need resolution (both senders and recipients)
    const allUserIds = Array.from(new Set([
      ...rawNotifications.map(n => n.senderId),
      ...rawNotifications.map(n => n.recipientId)
    ]));

    // Using a map to store resolved users
    const userMap = new Map<string, User>();

    // Fetch all user details in parallel
    await Promise.all(allUserIds.map(async (id) => {
      try {
        const user = await this.getUser(id);
        userMap.set(id, user);
      } catch (e) {
        console.warn(`Failed to fetch user details for user ${id}`, e);
        userMap.set(id, { id, username: "Unknown" } as User);
      }
    }));

    // Map to NotificationItem - now supporting all notification types
    const validNotifications: NotificationItem[] = rawNotifications.map(n => {
      const sender = userMap.get(n.senderId);
      const recipient = userMap.get(n.recipientId);

      // Map backend notification type to frontend type
      let frontendType: 'friend_request' | 'accept_friend_request' | 'deny_friend_request';

      if (n.type === NotificationType.FRIEND_REQUEST) {
        frontendType = 'friend_request';
      } else if (n.type === NotificationType.ACCEPTED_FRIEND_REQUEST) {
        frontendType = 'accept_friend_request';
      } else if (n.type === NotificationType.DENIED_FRIEND_REQUEST) {
        frontendType = 'deny_friend_request';
      } else {
        return null; // Unknown type
      }

      return {
        id: n.id,
        type: frontendType,
        sender: {
          id: n.senderId,
          username: sender ? sender.username : 'Unknown'
        },
        recipient: {
          id: n.recipientId,
          username: recipient ? recipient.username : 'Unknown'
        },
        content: n.content, // Notification message from backend
        timestamp: new Date(), // Backend doesn't return timestamp for notifications yet, defaulting to now
        status: n.status, // Include status: pending, accepted, rejected, cancelled
        isRead: n.isRead
      };
    }).filter(Boolean) as NotificationItem[];

    return validNotifications;
  },

  // Get notifications where user is RECIPIENT only
  // Used by Notification Panel to display notifications
  async getNotifications(currentUserId: string): Promise<NotificationItem[]> {
    const data = await apiClient.get('/v1/notifications');
    // Returns GetNotificationResponse[] which has senderId, recipientId

    if (!Array.isArray(data)) return [];

    let rawNotifications = data as GetNotificationResponse[];
    if (rawNotifications.length === 0) return [];

    // Filter by recipient ONLY - user should only see notifications sent TO them
    rawNotifications = rawNotifications.filter(n => n.recipientId === currentUserId);

    // Extract unique user IDs that need resolution (both senders and recipients)
    const allUserIds = Array.from(new Set([
      ...rawNotifications.map(n => n.senderId),
      ...rawNotifications.map(n => n.recipientId)
    ]));

    // Using a map to store resolved users
    const userMap = new Map<string, User>();

    // Fetch all user details in parallel
    await Promise.all(allUserIds.map(async (id) => {
      try {
        const user = await this.getUser(id);
        userMap.set(id, user);
      } catch (e) {
        console.warn(`Failed to fetch user details for user ${id}`, e);
        userMap.set(id, { id, username: "Unknown" } as User);
      }
    }));

    // Map to NotificationItem - now supporting all notification types
    const validNotifications: NotificationItem[] = rawNotifications.map(n => {
      const sender = userMap.get(n.senderId);
      const recipient = userMap.get(n.recipientId);

      // Map backend notification type to frontend type
      let frontendType: 'friend_request' | 'accept_friend_request' | 'deny_friend_request';

      if (n.type === NotificationType.FRIEND_REQUEST) {
        frontendType = 'friend_request';
      } else if (n.type === NotificationType.ACCEPTED_FRIEND_REQUEST) {
        frontendType = 'accept_friend_request';
      } else if (n.type === NotificationType.DENIED_FRIEND_REQUEST) {
        frontendType = 'deny_friend_request';
      } else {
        return null; // Unknown type
      }

      return {
        id: n.id,
        type: frontendType,
        sender: {
          id: n.senderId,
          username: sender ? sender.username : 'Unknown'
        },
        recipient: {
          id: n.recipientId,
          username: recipient ? recipient.username : 'Unknown'
        },
        content: n.content, // Notification message from backend
        timestamp: new Date(), // Backend doesn't return timestamp for notifications yet, defaulting to now
        status: n.status, // Include status: pending, accepted, rejected, cancelled
        isRead: n.isRead
      };
    }).filter(Boolean) as NotificationItem[];

    return validNotifications;
  },

  async responseFriendRequest(
    notificationId: string,
    targetUserId: string,
    targetUsername: string,
    action: 'accept' | 'deny' | 'cancel'
  ): Promise<void> {
    const endpoint = action === 'accept' ? 'accept' : action === 'deny' ? 'deny' : 'cancel';

    await apiClient.post(`/v1/notification/friend-request/${endpoint}`, {
      notificationId: notificationId,
      recipient: {
        id: targetUserId,
        username: targetUsername
      }
    });
  },

  async markNotificationsAsRead(): Promise<void> {
    await apiClient.put("/v1/notifications/read");
  },

  async cancelFriendRequest(
    notificationId: string,
    userId: string,
    username: string
  ): Promise<void> {
    await this.responseFriendRequest(notificationId, userId, username, 'cancel');
  },

  async unfriend(userId: string, conversations: Conversation[]): Promise<void> {
    // Find the direct conversation with this user
    const directConversation = conversations.find(
      c => c.type === 'direct' && c.participants.some(p => p.userId === userId)
    );

    if (!directConversation) {
      throw new Error('No direct conversation found with this user');
    }

    // Delete the conversation (this effectively unfriends the user)
    await apiClient.delete(`/v1/conversation?conversationId=${directConversation.id}`);
  },

  async addParticipants(data: {
    conversationId: string;
    participants: { userId: string }[];
  }): Promise<void> {
    await apiClient.post("/v1/conversation/participants", {
      conversationId: data.conversationId,
      participantIds: data.participants.map(p => p.userId)
    });
  },
};
