import { useState } from 'react';
import { X, UserPlus, UserMinus, UserX, Mail } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/common/Avatar';

interface AddFriendModalProps {
    onClose: () => void;
}

export function AddFriendModal({ onClose }: AddFriendModalProps) {
    const { users, sendFriendRequest, cancelFriendRequest, unfriend, conversations, allNotifications } = useChat();
    const { currentUser } = useAuth();
    const [actioningUserId, setActioningUserId] = useState<string | null>(null);

    // Get existing direct chat user IDs (these are friends)
    const existingDirectChatUserIds = new Set(
        (conversations || [])
            .filter(c => c.type === 'direct')
            .flatMap(c => c.participants)
            .map(p => p.userId)
    );

    const availableUsers = users.filter(u => u.id !== currentUser?.id);

    // Helper to get relationship status with a user
    const getRelationshipStatus = (userId: string) => {
        // Check if they're already friends (have a direct conversation)
        if (existingDirectChatUserIds.has(userId)) {
            return { type: 'friend' as const };
        }

        // Only check for PENDING friend_request notifications
        // Rejected and cancelled notifications should be treated as "none"

        // Sent by me to them (I'm sender, they're recipient)
        const sentByMe = allNotifications.find(n =>
            n.type === 'friend_request' &&
            n.status === 'pending' &&
            n.sender.id === currentUser?.id &&
            n.recipient.id === userId
        );

        // Received from them (they're sender, I'm recipient)
        const receivedFromThem = allNotifications.find(n =>
            n.type === 'friend_request' &&
            n.status === 'pending' &&
            n.sender.id === userId &&
            n.recipient.id === currentUser?.id
        );

        // If I sent a pending request
        if (sentByMe) {
            return {
                type: 'pending_sent' as const,
                notificationId: sentByMe.id
            };
        }

        // If I received a pending request
        if (receivedFromThem) {
            return {
                type: 'pending_received' as const,
                notificationId: receivedFromThem.id
            };
        }

        // No pending requests = can send new request
        return { type: 'none' as const };
    };

    const handleSendFriendRequest = async (userId: string, username: string) => {
        setActioningUserId(userId);
        try {
            await sendFriendRequest(userId, username);
            alert(`Friend request sent to ${username}`);
        } catch (error) {
            console.error('Failed to send friend request:', error);
            alert('Failed to send friend request');
        } finally {
            setActioningUserId(null);
        }
    };

    const handleCancelFriendRequest = async (notificationId: string, userId: string, username: string) => {
        setActioningUserId(userId);
        try {
            await cancelFriendRequest(notificationId, userId, username);
            alert(`Friend request to ${username} cancelled`);
        } catch (error) {
            console.error('Failed to cancel friend request:', error);
            alert('Failed to cancel friend request');
        } finally {
            setActioningUserId(null);
        }
    };

    const handleUnfriend = async (userId: string, username: string) => {
        if (!confirm(`Are you sure you want to unfriend ${username}?`)) {
            return;
        }

        setActioningUserId(userId);
        try {
            await unfriend(userId);
            alert(`Unfriended ${username}`);
        } catch (error) {
            console.error('Failed to unfriend:', error);
            alert('Failed to unfriend');
        } finally {
            setActioningUserId(null);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">Add Friend</h3>
                    <button onClick={onClose} className="modal-close">
                        <X />
                    </button>
                </div>

                <div className="modal-description">
                    Send friend requests to connect with other users
                </div>

                <div className="user-list">
                    {availableUsers.length === 0 ? (
                        <p className="user-list-empty">No users available</p>
                    ) : (
                        availableUsers.map(user => {
                            const relationship = getRelationshipStatus(user.id);
                            const isActioning = actioningUserId === user.id;

                            return (
                                <div key={user.id} className="user-item">
                                    <div className="user-item-content">
                                        <Avatar name={user.username} size="md" />
                                        <div className="user-info">
                                            <p className="user-name">{user.username}</p>
                                            <p className="user-subtitle">{user.name}</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {/* No relationship - can send friend request */}
                                        {relationship.type === 'none' && (
                                            <>
                                                <button
                                                    onClick={() => handleSendFriendRequest(user.id, user.username)}
                                                    className="p-1 hover:bg-gray-100 rounded-full text-ocean-600"
                                                    title="Send Friend Request"
                                                    disabled={isActioning}
                                                >
                                                    <UserPlus size={20} />
                                                </button>
                                            </>
                                        )}

                                        {/* Pending request sent by me */}
                                        {relationship.type === 'pending_sent' && (
                                            <>
                                                <span className="status-badge status-pending">⏳ Pending</span>
                                                <button
                                                    onClick={() => handleCancelFriendRequest(relationship.notificationId, user.id, user.username)}
                                                    className="p-1 hover:bg-gray-100 rounded-full text-red-600"
                                                    title="Cancel Friend Request"
                                                    disabled={isActioning}
                                                >
                                                    <UserMinus size={20} />
                                                </button>
                                            </>
                                        )}

                                        {/* Already friends */}
                                        {relationship.type === 'friend' && (
                                            <>
                                                <span className="status-badge status-accepted">✅ Friends</span>
                                                <button
                                                    onClick={() => handleUnfriend(user.id, user.username)}
                                                    className="p-1 hover:bg-gray-100 rounded-full text-red-600"
                                                    title="Unfriend"
                                                    disabled={isActioning}
                                                >
                                                    <UserX size={20} />
                                                </button>
                                            </>
                                        )}

                                        {/* Pending request received from them */}
                                        {relationship.type === 'pending_received' && (
                                            <>
                                                <span className="status-badge status-pending">📬 Request Received</span>
                                                <button
                                                    className="p-1 rounded-full text-blue-600"
                                                    title="Friend Request Received (check notifications to accept/reject)"
                                                    disabled
                                                >
                                                    <Mail size={20} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
