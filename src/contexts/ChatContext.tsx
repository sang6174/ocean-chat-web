import { createContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import { useAuth } from '../hooks/useAuth';
import type { User } from "../types/user.types";
import type { Conversation, Message, ChatContextType, CreateConversationData, SendMessageData, NotificationItem } from '../types/chat.types';

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUser, setCurrentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]); // Recipient only
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]); // All notifications

  // One-time enrichment of currentUser profile (to get real name etc.)
  // We do this here instead of Login API per user preference for dedicated profile API
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.id) {
      chatService.getUser(currentUser.id)
        .then(data => {
          if (data && data.name) {
            console.log('ChatContext: Enriched current user profile from Profile API');
            setCurrentUser({
              ...currentUser,
              name: data.name,
              email: data.email || currentUser.email
            });
          }
        })
        .catch(err => console.error('ChatContext: Failed to enrich profile', err));
    }
  }, [isAuthenticated, currentUser?.id]); // Only runs when session starts or user changes

  const loadConversations = useCallback(async () => {
    console.log('loadConversations called. currentUser:', currentUser);
    if (!currentUser) return;

    try {
      console.log('Fetching conversations for user:', currentUser.id);
      const data = await chatService.getConversations(currentUser.id);
      console.log('Conversations fetched:', data);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [currentUser]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await chatService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  // Load notifications where user is RECIPIENT (for Notification Panel)
  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await chatService.getNotifications(currentUser.id);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  }, [currentUser]);

  // Load ALL notifications involving user (for AddFriendModal)
  const loadAllNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await chatService.getAllNotificationsForUser(currentUser.id);
      setAllNotifications(data);
    } catch (error) {
      console.error("Failed to load all notifications", error);
    }
  }, [currentUser]);

  const selectConversation = useCallback(async (id: string) => {
    setSelectedConversation(id);
    try {
      const data = await chatService.getMessages(id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  const createConversation = useCallback(async (data: CreateConversationData) => {
    if (!currentUser) return;

    try {
      // Map participant IDs to full objects
      const participants = data.participantIds.map(id => {
        const user = users.find(u => u.id === id);
        return {
          userId: id,
          username: user?.username || "Unknown"
        };
      })

      // Add current user to participants list (creator must be a member)
      const allParticipants = [
        { userId: currentUser.id, username: currentUser.username },
        ...participants
      ];

      const response = await chatService.createConversation({
        type: data.type,
        name: data.name,
        participants: allParticipants.map(p => ({ userId: p.userId })),
      });

      // Map backend response to frontend Conversation type
      const newConversation: Conversation = {
        id: response.conversation.id,
        type: response.conversation.type,
        name: response.conversation.name,
        creatorId: response.conversation.creator.id,
        creator: response.conversation.creator,
        participants: response.participants.map((p: any) => ({
          userId: p.user.id,
          username: p.user.username || "Unknown",
          role: p.role
        })),
        lastMessage: response.messages && response.messages.length > 0 ? {
          id: response.messages[0].id,
          content: response.messages[0].content,
          sender: {
            id: response.messages[0].senderId || "",
            username: "System" // Usually the first message in a group is system message
          },
          conversationId: response.conversation.id,
          createdAt: new Date().toISOString()
        } : undefined
      };

      setConversations(prev => {
        if (prev.some(c => c.id === newConversation.id)) {
          return prev;
        }
        return [newConversation, ...prev];
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }, [currentUser, users, loadConversations]);

  const sendMessage = useCallback(async (data: SendMessageData) => {
    if (!currentUser) return;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: "temp-" + Date.now(),
      content: data.content,
      sender: {
        id: currentUser.id,
        username: currentUser.username,
      },
      conversationId: data.conversationId,
      createdAt: new Date().toISOString()
    };

    // Update UI immediately (messages and conversation list)
    setMessages(prev => [...prev, optimisticMessage]);
    setConversations(prev => {
      const convIndex = prev.findIndex(c => c.id === data.conversationId);
      if (convIndex === -1) return prev;

      const updatedConv = { ...prev[convIndex], lastMessage: optimisticMessage };
      const otherConvs = prev.filter(c => c.id !== data.conversationId);
      return [updatedConv, ...otherConvs];
    });

    try {
      await chatService.sendMessage({
        conversationId: data.conversationId,
        sender: {
          id: currentUser.id,
          username: currentUser.username,
        },
        content: data.content,
      });
      // Don't need to do anything else if successful, as we already updated UI.
    } catch (error: any) {
      console.error('Failed to send message:', error);
      if (error.message) console.error('Error message:', error.message);
      if (error.response) console.error('Error response:', await error.response.clone().json());
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      // Reload conversations to sync state correctly on failure
      loadConversations();
      throw error;
    }
  }, [currentUser, loadConversations]);

  const sendFriendRequest = useCallback(async (userId: string, username: string) => {
    try {
      await chatService.sendFriendRequest(userId, username);
      // Reload both notifications for immediate UI update
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
      console.error("Failed to send friend request:", error);
      throw error;
    }
  }, [loadNotifications, loadAllNotifications]);

  const cancelFriendRequest = useCallback(async (notificationId: string, userId: string, username: string) => {
    try {
      await chatService.cancelFriendRequest(notificationId, userId, username);
      // Reload both notifications for immediate UI update
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
      console.error("Failed to cancel friend request:", error);
      throw error;
    }
  }, [loadNotifications, loadAllNotifications]);

  const acceptFriendRequest = useCallback(async (senderId: string) => {
    if (!currentUser) return;
    try {
      // Find notification ID
      const notification = notifications.find(n => n.sender.id === senderId && n.type === 'friend_request');
      if (!notification) {
        console.error("No friend request notification found for sender:", senderId);
        return;
      }

      await chatService.responseFriendRequest(notification.id, currentUser.id, currentUser.username, 'accept');
      // Reload notifications and conversations
      await loadNotifications();
      await loadAllNotifications();
      loadConversations();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      throw error;
    }
  }, [currentUser, notifications, loadConversations, loadNotifications, loadAllNotifications]);

  const denyFriendRequest = useCallback(async (senderId: string) => {
    if (!currentUser) return;
    try {
      const notification = notifications.find(n => n.sender.id === senderId && n.type === 'friend_request');
      if (!notification) {
        console.error("No friend request notification found for sender:", senderId);
        return;
      }

      await chatService.responseFriendRequest(notification.id, currentUser.id, currentUser.username, 'deny');
      // Reload both notifications for immediate UI update
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
      console.error("Failed to deny friend request:", error);
      throw error;
    }
  }, [currentUser, notifications, loadNotifications, loadAllNotifications]);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await chatService.markNotificationsAsRead();
      // Optimistically update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Also update allNotifications if needed (though it might have sender items too)
      setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }, []);

  const addParticipants = useCallback(async (conversationId: string, participantIds: string[]) => {
    if (!currentUser) return;
    try {
      await chatService.addParticipants({
        conversationId,
        participants: participantIds.map(id => ({ userId: id }))
      });
      // No loadConversations() here, WebSocket or manual optimization will handle it
    } catch (error) {
      console.error("Failed to add participants:", error);
      throw error;
    }
  }, [currentUser, loadConversations]);

  const unfriend = useCallback(async (userId: string) => {
    if (!currentUser) return;
    try {
      await chatService.unfriend(userId, conversations);
      // Remove the conversation from state
      setConversations(prev => prev.filter(c =>
        !(c.type === 'direct' && c.participants.some(p => p.userId === userId))
      ));
      // Reload both notifications for immediate UI update
      await loadNotifications();
      await loadAllNotifications();
    } catch (error) {
      console.error("Failed to unfriend:", error);
      throw error;
    }
  }, [currentUser, conversations, loadNotifications, loadAllNotifications]);

  const usersRef = useRef(users);
  const selectedConversationRef = useRef(selectedConversation);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewMessage = (payload: any) => {
      console.log('WS: Received message', payload);
      // payload structure from gateway: { type, metadata: { senderId, toConversationId }, data: "content" }
      // We need to construct a Message object

      const senderId = payload.metadata?.senderId;
      const conversationId = payload.metadata?.conversationId;
      const content = payload.data;

      // Allow empty senderId for system messages
      if (senderId === undefined || !conversationId || !content) {
        console.warn("Received malformed message via WebSocket", payload);
        return;
      }

      // Ignore own messages to avoid duplication with optimistic updates
      // Using ref to get latest currentUser
      if (currentUserRef.current && senderId === currentUserRef.current.id) {
        console.log('WS: Ignoring own message');
        return;
      }

      // 1. ALWAYS update lastMessage in the conversations list and move it to the top
      // This ensures sidebar updates even if we are in another chat
      const senderUser = usersRef.current.find((u: User) => u.id === senderId);
      const senderUsername = senderId ? (senderUser?.username || "Unknown") : "System";

      const newMessage: Message = {
        id: "ws-" + Date.now() + Math.random().toString(36).substr(2, 9), // More unique ID
        conversationId: conversationId,
        sender: {
          id: senderId || "", // Empty string means system message
          username: senderUsername,
        },
        content: content,
        createdAt: new Date().toISOString()
      };

      setConversations(prev => {
        const convIndex = prev.findIndex(c => c.id === conversationId);
        if (convIndex === -1) return prev;

        const updatedConv = { ...prev[convIndex], lastMessage: newMessage };
        const otherConvs = prev.filter(c => c.id !== conversationId);
        return [updatedConv, ...otherConvs];
      });

      // 2. Only update message history if it belongs to the selected conversation
      if (conversationId !== selectedConversationRef.current) {
        console.log('WS: Message for another conversation, updated sidebar only');
        return;
      }

      // Add to message history
      setMessages(prev => {
        // Check for duplicate messages (same sender, content, and within 2 seconds)
        const isDuplicate = prev.some(msg =>
          msg.sender.id === (senderId || "") &&
          msg.content === content &&
          Math.abs(new Date((msg.createdAt ?? new Date().toISOString())).getTime() - new Date((newMessage.createdAt ?? new Date().toISOString())).getTime()) < 2000
        );

        if (isDuplicate) {
          console.log('WS: Duplicate message detected, skipping', content.substring(0, 20));
          return prev;
        }

        console.log('WS: Appending new message to state', newMessage.id);
        return [...prev, newMessage];
      });
    };

    const handleNewConversation = (payload: any) => {
      console.log('WS: New conversation/participant event', payload);

      // Backend sends the main data in the 'data' property
      const convData = payload.data;
      if (!convData) return;

      const type = payload.type;
      const conversationId = payload.metadata?.conversationId;

      // Handle participant addition event specifically
      if (type === 'conversation.added.participants' && conversationId) {
        console.log('WS: Handling participant addition for', conversationId);

        const newParticipants = convData.participants.map((p: any) => ({
          userId: p.user.id,
          username: p.user.username || "Unknown",
          role: p.role
        }));

        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            // Filter out any duplicates and add new ones
            const existingIds = new Set(conv.participants.map(p => p.userId));
            const uniqueNew = newParticipants.filter((p: any) => !existingIds.has(p.userId));

            if (uniqueNew.length === 0) return conv;

            return {
              ...conv,
              participants: [...conv.participants, ...uniqueNew]
            };
          }
          return conv;
        }));

        // Final fallback to ensure sync
        setTimeout(() => loadConversations(), 2000);
        return;
      }

      // If this is a full conversation object (from 'conversation.created')
      if (convData.conversation) {
        // Map to frontend type
        const newConv: Conversation = {
          id: convData.conversation.id,
          type: convData.conversation.type,
          name: convData.conversation.name,
          creatorId: convData.conversation.creator.id,
          creator: convData.conversation.creator,
          participants: convData.participants.map((p: any) => ({
            userId: p.user.id,
            username: p.user.username || "Unknown",
            role: p.role
          })),
          lastMessage: convData.messages && convData.messages.length > 0 ? {
            id: convData.messages[0].id,
            content: convData.messages[0].content,
            sender: {
              id: convData.messages[0].senderId || "",
              username: "System"
            },
            conversationId: convData.conversation.id,
            createdAt: new Date().toISOString()
          } : undefined
        };

        setConversations(prev => {
          // Check if it already exists
          if (prev.find(c => c.id === newConv.id)) {
            return prev.map(c => c.id === newConv.id ? newConv : c);
          }
          return [newConv, ...prev];
        });
      } else {
        // If it's just a participant update or other partial event, reload all
        loadConversations();
      }
    };

    const handleFriendRequest = async (payload: any) => {
      console.log('WS: Friend request received', payload);
      const senderId = payload.metadata?.senderId;

      if (!senderId) return;

      // Reload notifications from backend to get real ID and details
      await loadNotifications();
      await loadAllNotifications();
    };

    const handleFriendAccepted = (payload: any) => {
      console.log('WS: Friend request accepted', payload);
      loadConversations();
      loadNotifications();
      loadAllNotifications();
    };

    const handleFriendCancelled = async (payload: any) => {
      console.log('WS: Friend request cancelled', payload);
      await loadNotifications();
      await loadAllNotifications();
    };

    const handleFriendDenied = async (payload: any) => {
      console.log('WS: Friend request denied', payload);
      await loadNotifications();
      await loadAllNotifications();
    };

    websocketService.on('message.created', handleNewMessage);
    websocketService.on('conversation.created', handleNewConversation);
    websocketService.on('conversation.added.participants', handleNewConversation);
    websocketService.on('notification.friend.request', handleFriendRequest);
    websocketService.on('notification.accepted.friend.request', handleFriendAccepted);
    websocketService.on('notification.cancelled.friend.request', handleFriendCancelled);
    websocketService.on('notification.denied.friend.request', handleFriendDenied);

    return () => {
      websocketService.off('message.created', handleNewMessage);
      websocketService.off('conversation.created', handleNewConversation);
      websocketService.off('conversation.added.participants', handleNewConversation);
      websocketService.off('notification.friend.request', handleFriendRequest);
      websocketService.off('notification.accepted.friend.request', handleFriendAccepted);
      websocketService.off('notification.cancelled.friend.request', handleFriendCancelled);
      websocketService.off('notification.denied.friend.request', handleFriendDenied);
    };
  }, [isAuthenticated, loadConversations, loadNotifications]);

  useEffect(() => {
    console.log('ChatContext effect triggered. Auth:', isAuthenticated, 'User:', currentUser);
    if (isAuthenticated && currentUser) {
      loadConversations();
      loadUsers();
      loadNotifications();
      loadAllNotifications(); // Load all notifications for AddFriendModal
    } else {
      console.log('ChatContext skip: Auth or User missing');
    }
  }, [isAuthenticated, currentUser, loadConversations, loadUsers, loadNotifications, loadAllNotifications]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        selectedConversation,
        messages,
        users,
        selectConversation,
        createConversation,
        sendMessage,
        loadConversations,
        loadUsers,

        sendFriendRequest,
        cancelFriendRequest,
        acceptFriendRequest,
        denyFriendRequest,
        unfriend,

        notifications,
        allNotifications,
        addParticipants,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
