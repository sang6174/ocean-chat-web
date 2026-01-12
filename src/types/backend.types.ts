
// ============================================================
// ENUMS
// ============================================================
export const ConversationType = {
    Group: "group",
    Direct: "direct",
    Myself: "myself",
} as const;
export type ConversationType = typeof ConversationType[keyof typeof ConversationType];

export const ConversationRoleType = {
    ADMIN: "admin",
    MEMBER: "member",
} as const;
export type ConversationRoleType = typeof ConversationRoleType[keyof typeof ConversationRoleType];

export const NotificationType = {
    FRIEND_REQUEST: "friend_request",
    ACCEPTED_FRIEND_REQUEST: "accept_friend_request",
    REJECTED_FRIEND_REQUEST: "reject_friend_request",
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const NotificationStatusType = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    CANCELLED: "cancelled",
} as const;
export type NotificationStatusType = typeof NotificationStatusType[keyof typeof NotificationStatusType];

// ============================================================
// DOMAIN ENTITIES
// ============================================================
export interface BackendUser {
    id: string;
    name: string;
    email: string;
}

export interface BackendConversation {
    id: string;
    type: ConversationType;
    name: string;
    lastEvent?: string; // Date sent as string
    creator: {
        id: string;
        username: string;
    };
}

export interface BackendParticipant {
    user: {
        id: string;
        username: string;
        name?: string;
        email?: string;
    };
    role: string;
    lastSeen?: string;
    joinedAt?: string;
}

export interface BackendMessage {
    id: string;
    content: string; // Entity usually has 'content'
    senderId: string | null;
    conversationId: string;
}

export interface BackendNotification {
    id: string;
    type: NotificationType;
    status: NotificationStatusType;
    sender: {
        id: string;
        username: string;
    };
    recipient: {
        id: string;
        username: string;
    };
    content?: string;
}

// ============================================================
// API RESPONSES
// ============================================================

// Auth
export interface LoginResponse {
    userId: string;
    username: string;
    accessToken: string;
    email: string;
}

export interface RegisterResponse {
    code: string;
    message: string;
}

// Chat
export interface GetConversationsResponseItem {
    conversation: BackendConversation;
    participants: BackendParticipant[];
    messages: Omit<BackendMessage, "conversationId">[];
}

export interface GetMessagesResponseItem {
    id: string;
    sender: {
        id: string;
        username: string;
    };
    conversationId: string;
    message: string; // The service output maps 'content' to 'message'
    createdAt?: string; // Backend might not send this in this specific DTO based on domain.ts, but let's check
}

// User
export interface GetProfileUserResponse extends BackendUser {
    username: string;
}

// Notifications
export interface SendFriendRequestResponse {
    id: string;
    type: NotificationType;
    status: NotificationStatusType;
    content: string;
    senderId: string;
    recipientId: string;
}

export interface GetNotificationResponse {
    id: string;
    type: NotificationType;
    status: NotificationStatusType;
    isRead: boolean;
    content: string;
    senderId: string;
    recipientId: string;
}

// Ws Events
export interface WsConversationCreated {
    sender: { id: string; username: string };
    recipients: { id: string; username: string }[];
    conversation: {
        conversation: BackendConversation;
        participants: BackendParticipant[];
        messages: Omit<BackendMessage, "conversationId">[];
    };
}

export interface WsMessageCreated {
    sender: { id: string; username: string };
    recipients: { id: string; username: string }[];
    message: BackendMessage; // Or possibly the mapped one?
}
