import { UserPlus, Check, X } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import type { NotificationItem } from '../../types/chat.types';

// export interface NotificationItem was here, now imported

interface NotificationDropdownProps {
    notifications: NotificationItem[];
}

export function NotificationDropdown({ notifications }: NotificationDropdownProps) {
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
                        <div key={notif.id} className={`notification-item ${!notif.isRead ? 'unread' : ''}`}>
                            <div className="notification-icon">
                                <UserPlus size={20} />
                            </div>
                            <div className="notification-content">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <p>{notif.content}</p>
                                    {!notif.isRead && <div className="unread-indicator" title="Unread" />}
                                </div>
                                {notif.type === 'friend_request' && notif.status === 'pending' && (
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
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
