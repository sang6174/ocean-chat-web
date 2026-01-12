import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';

interface CreateGroupChatModalProps {
    onClose: () => void;
}

export function CreateGroupChatModal({ onClose }: CreateGroupChatModalProps) {
    const { users, createConversation, conversations } = useChat();
    const { currentUser } = useAuth();
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (selectedUsers.length === 0) return;
        if (!groupName.trim()) {
            alert('Please enter a group name');
            return;
        }

        setLoading(true);
        try {
            await createConversation({
                type: 'group',
                participantIds: selectedUsers,
                name: groupName.trim(),
            });
            onClose();
        } catch (error) {
            console.error('Failed to create group chat:', error);
            alert('Failed to create group chat');
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Derive friends list from direct conversations
    const friendIds = new Set(
        conversations
            .filter(c => c.type === 'direct')
            .flatMap(c => c.participants)
            .map(p => p.userId)
            .filter(id => id !== currentUser?.id)
    );

    const availableUsers = users.filter(u => friendIds.has(u.id));

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">Create Group Chat</h3>
                    <button onClick={onClose} className="modal-close">
                        <X />
                    </button>
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Group name..."
                        className="form-input"
                    />
                </div>

                <div className="modal-description">
                    {selectedUsers.length === 0
                        ? 'Select users to add to the group'
                        : `${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} selected`}
                </div>

                <div className="user-list">
                    {availableUsers.length === 0 ? (
                        <p className="user-list-empty">No users available</p>
                    ) : (
                        availableUsers.map(user => (
                            <div
                                key={user.id}
                                className="user-item"
                                onClick={() => toggleUser(user.id)}
                            >
                                <div className="user-item-content">
                                    <Avatar name={user.username} size="md" />
                                    <div className="user-info">
                                        <p className="user-name">{user.username}</p>
                                        <p className="user-subtitle">{user.name}</p>
                                    </div>
                                </div>

                                {selectedUsers.includes(user.id) && (
                                    <Check className="user-check" />
                                )}
                            </div>
                        ))
                    )}
                </div>

                <Button
                    onClick={handleCreate}
                    disabled={selectedUsers.length === 0 || !groupName.trim() || loading}
                    className="btn-full"
                >
                    {loading ? 'Creating...' : 'Create Group Chat'}
                </Button>
            </div>
        </div>
    );
}
