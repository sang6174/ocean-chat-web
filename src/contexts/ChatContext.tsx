import { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import { useAuth } from '../hooks/useAuth';
import type { User } from "../types/user.types";
import type { Conversation, Message, ChatContextType, CreateConversationData, SendMessageData } from '../types/chat.types';
import type { NotificationItem } from '../components/common/NotificationDropdown';

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
      });

      // Add current user to participants
      participants.push({
        userId: currentUser.id,
        username: currentUser.username
      });

      await chatService.createConversation({
        type: data.type,
        metadata: {
          name: data.groupName || '',
        },
        creator: {
          id: currentUser.id,
          username: currentUser.username,
        },
        participants: participants,
      });
      await loadConversations();
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

    // Update UI immediately
    setMessages(prev => [...prev, optimisticMessage]);

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
    } catch (error) {
      console.error('Failed to send message:', error);
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      throw error;
    }
  }, [currentUser]);

  const sendFriendRequest = useCallback(async (userId: string, username: string) => {
    try {
      await chatService.sendFriendRequest(userId, username);
    } catch (error) {
      console.error("Failed to send friend request:", error);
      throw error;
    }
  }, []);

  const acceptFriendRequest = useCallback(async (senderId: string, senderUsername: string) => {
    if (!currentUser) return;
    try {
      // Logic: I am the one accepting, so I pass the senderId as the "target" to accept
      // The original sender (senderId) is who sent the request.
      await chatService.responseFriendRequest(senderId, senderUsername, 'accept');
      // Remove from notifications
      setNotifications(prev => prev.filter(n => n.sender.id !== senderId));
      loadConversations();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      throw error;
    }
  }, [currentUser, loadConversations]);

  const denyFriendRequest = useCallback(async (senderId: string, senderUsername: string) => {
    if (!currentUser) return;
    try {
      await chatService.responseFriendRequest(senderId, senderUsername, 'deny');
      setNotifications(prev => prev.filter(n => n.sender.id !== senderId));
    } catch (error) {
      console.error("Failed to deny friend request:", error);
      throw error;
    }
  }, [currentUser]);

  const addParticipants = useCallback(async (conversationId: string, participantIds: string[]) => {
    if (!currentUser) return;
    try {
      const participants = participantIds.map(id => {
        const user = users.find(u => u.id === id);
        return {
          userId: id,
          username: user?.username || "Unknown"
        };
      });

      await chatService.addParticipants({
        conversationId,
        creator: { id: currentUser.id, username: currentUser.username },
        participants
      });
      // Gateway event will handle the update via handleNewConversation/handleParticipantAdded if needed
      // Or we can reload manually
      loadConversations();
    } catch (error) {
      console.error("Failed to add participants:", error);
      throw error;
    }
  }, [currentUser, users, loadConversations]);

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
      const conversationId = payload.metadata?.toConversationId;
      const content = payload.data;

      if (!senderId || !conversationId || !content) {
        console.warn("Received malformed message via WebSocket", payload);
        return;
      }

      // Ignore own messages to avoid duplication with optimistic updates
      // Using ref to get latest currentUser
      if (currentUserRef.current && senderId === currentUserRef.current.id) {
        console.log('WS: Ignoring own message');
        return;
      }

      // Only update messages if it belongs to the selected conversation
      if (conversationId !== selectedConversationRef.current) {
        console.log('WS: Message for another conversation, skipping message list update');
        loadConversations(); // Still reload conversations to update sidebar
        return;
      }

      // Try to find sender details using ref
      const senderUser = usersRef.current.find((u: User) => u.id === senderId);
      const senderUsername = senderUser?.username || "Unknown";

      const newMessage: Message = {
        id: "ws-" + Date.now(), // Backend doesn't send ID in WS event
        conversationId: conversationId,
        sender: {
          id: senderId,
          username: senderUsername,
        },
        content: content,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => {
        console.log('WS: Appending new message to state', newMessage.id);
        return [...prev, newMessage];
      });

      loadConversations();
    };

    const handleNewConversation = (payload: any) => {
      console.log('WS: New conversation created', payload);
      loadConversations();
    };

    const handleFriendRequest = (payload: any) => {
      console.log('WS: Friend request received', payload);
      const senderId = payload.metadata?.senderId;
      let message = payload.data;
      let senderUsername = "Unknown";

      // Extract username from message if possible "X send you..."
      if (typeof message === 'string' && message.includes(' send you a friend request.')) {
        senderUsername = message.replace(' send you a friend request.', '');
      } else if (typeof message === 'string' && message.includes(' send you a add friend invitation.')) {
        senderUsername = message.replace(' send you a add friend invitation.', '');
      }

      const newNotification: NotificationItem = {
        id: "notif-" + Date.now(),
        type: 'friend_request',
        sender: {
          id: senderId,
          username: senderUsername
        },
        timestamp: new Date()
      };

      setNotifications(prev => {
        // Prevent duplicate friend requests from same sender
        const exists = prev.some(n =>
          n.type === 'friend_request' &&
          n.sender.id === senderId
        );

        if (exists) return prev;

        return [newNotification, ...prev];
      });
    };

    const handleFriendAccepted = (payload: any) => {
      console.log('WS: Friend request accepted', payload);
      loadConversations();
    };

    websocketService.on('message.created', handleNewMessage);
    websocketService.on('conversation.created', handleNewConversation);
    websocketService.on('notification.add.friend', handleFriendRequest);
    websocketService.on('notification.accepted.friend', handleFriendAccepted);

    return () => {
      websocketService.off('message.created', handleNewMessage);
      websocketService.off('conversation.created', handleNewConversation);
      websocketService.off('notification.add.friend', handleFriendRequest);
      websocketService.off('notification.accepted.friend', handleFriendAccepted);
    };
  }, [isAuthenticated, loadConversations]);

  useEffect(() => {
    console.log('ChatContext effect triggered. Auth:', isAuthenticated, 'User:', currentUser);
    if (isAuthenticated && currentUser) {
      loadConversations();
      loadUsers();
    } else {
      console.log('ChatContext skip: Auth or User missing');
    }
  }, [isAuthenticated, currentUser, loadConversations, loadUsers]);

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
        acceptFriendRequest,
        denyFriendRequest,

        notifications,
        addParticipants,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
