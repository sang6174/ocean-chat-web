import React from 'react';
import { UserPlus, Check, X } from 'lucide-react';
import { useChat } from '../../hooks/useChat';

export interface NotificationItem {
    id: string; // Unique ID for the notification in UI state
    type: 'friend_request';
    sender: {
        id: string;
        username: string;
    };
    timestamp: Date;
}

interface NotificationDropdownProps {
    notifications: NotificationItem[];
    onClose: () => void;
}

export function NotificationDropdown({ notifications, onClose }: NotificationDropdownProps) {
    const { acceptFriendRequest, denyFriendRequest } = useChat();

    const handleAccept = async (notification: NotificationItem) => {
        try {
            await acceptFriendRequest(notification.sender.id, notification.sender.username);
            // Notifications state should be updated by context
        } catch (error) {
            console.error("Failed to accept friend request", error);
        }
    };

    const handleDeny = async (notification: NotificationItem) => {
        try {
            await denyFriendRequest(notification.sender.id, notification.sender.username);
        } catch (error) {
            console.error("Failed to deny friend request", error);
        }
    };

    return (
        <div className="notification-dropdown">
            <div className="notification-header">
                <h3>Notifications</h3>
            </div>
            <div className="notification-list">
                {notifications.length === 0 ? (
                    <div className="notification-empty">
                        <p>No new notifications</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div key={notif.id} className="notification-item">
                            <div className="notification-icon">
                                <UserPlus size={20} />
                            </div>
                            <div className="notification-content">
                                <p>
                                    <span className="font-bold">{notif.sender.username}</span> sent you a friend request.
                                </p>
                                <div className="notification-actions">
                                    <button
                                        className="action-btn accept"
                                        onClick={() => handleAccept(notif)}
                                    >
                                        <Check size={16} /> Accept
                                    </button>
                                    <button
                                        className="action-btn deny"
                                        onClick={() => handleDeny(notif)}
                                    >
                                        <X size={16} /> Deny
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
