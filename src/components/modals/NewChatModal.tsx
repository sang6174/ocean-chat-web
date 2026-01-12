import { useState } from 'react';
import { X, Check, UserPlus, UserCheck } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';

interface NewChatModalProps {
  onClose: () => void;
}

export function NewChatModal({ onClose }: NewChatModalProps) {
  const { users, createConversation, sendFriendRequest, conversations } = useChat();
  const { currentUser } = useAuth();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  // ... (keep handleCreate and toggleUser same) ...
  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    if (selectedUsers.length > 1 && !groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      await createConversation({
        type: selectedUsers.length === 1 ? 'direct' : 'group',
        participantIds: selectedUsers,
        name: groupName.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to create conversation');
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

  const existingDirectChatUserIds = new Set(
    (conversations || [])
      .filter(c => c.type === 'direct')
      .flatMap(c => c.participants)
      .map(p => p.userId)
  );

  // Show ALL users except current user (don't filter friends)
  const availableUsers = users.filter(u =>
    u.id !== currentUser?.id
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">New Conversation</h3>
          <button onClick={onClose} className="modal-close">
            <X />
          </button>
        </div>

        {selectedUsers.length > 1 && (
          <div className="form-group">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="form-input"
            />
          </div>
        )}

        <div className="modal-description">
          {selectedUsers.length === 0
            ? 'Select users to start a conversation'
            : `${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} selected`}
        </div>

        <div className="user-list">
          {availableUsers.length === 0 ? (
            <p className="user-list-empty">No users available</p>
          ) : (
            availableUsers.slice(0, visibleCount).map(user => {
              const isFriend = existingDirectChatUserIds.has(user.id);
              // Simple check if friend request sent? (Assuming standard flow, we might not track 'sentRequests' purely here without context update, but let's stick to user request: "only non-friends can send")

              return (
                <div
                  key={user.id}
                  className={`user-item ${!isFriend ? 'opacity-75' : 'cursor-pointer hover:bg-gray-50'}`}
                >
                  <div
                    className="user-item-content"
                    onClick={() => {
                      if (isFriend) {
                        toggleUser(user.id);
                      }
                    }}
                    style={{ cursor: isFriend ? 'pointer' : 'default' }}
                  >
                    <Avatar name={user.username} size="md" />
                    <div className="user-info">
                      <p className="user-name">
                        {user.username}
                        {!isFriend && <span className="text-xs text-gray-400 ml-2">(Not a friend)</span>}
                      </p>
                      <p className="user-subtitle">{user.name}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isFriend ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendFriendRequest(user.id, user.username)
                            .then(() => alert(`Friend request sent to ${user.username}`))
                            .catch(() => alert('Failed to send friend request'));
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full text-ocean-600"
                        title="Send Friend Request"
                      >
                        <UserPlus size={20} />
                      </button>
                    ) : (
                      <button
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                        title="Already friends"
                        disabled
                      >
                        <UserCheck size={20} />
                      </button>
                    )}

                    {selectedUsers.includes(user.id) && (
                      <Check className="user-check" />
                    )}
                  </div>
                </div>
              )
            })
          )}
          {availableUsers.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount(prev => prev + 5)}
                className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
              >
                Load more
              </button>
            </div>
          )}
        </div>

        <Button
          onClick={handleCreate}
          disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim()) || loading}
          className="btn-full"
        >
          {loading ? 'Creating...' : 'Create Conversation'}
        </Button>
      </div>
    </div>
  );
}