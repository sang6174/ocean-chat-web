import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';

interface AddParticipantsModalProps {
  onClose: () => void;
}

export function AddParticipantsModal({ onClose }: AddParticipantsModalProps) {
  const { users, conversations, selectedConversation, addParticipants } = useChat();
  const { currentUser } = useAuth();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const conversation = (conversations || []).find(c => c.id === selectedConversation);
  const existingParticipantIds = conversation?.participants.map(p => p.userId) || [];

  // Calculate friends based on existing direct conversations
  const friendIds = new Set(
    (conversations || [])
      .filter(c => c.type === 'direct')
      .flatMap(c => c.participants)
      .map(p => p.userId)
  );

  // Filter: Not current user, not already in group, AND must be a friend
  const availableUsers = (users || []).filter(
    u => u.id !== currentUser?.id &&
      !existingParticipantIds.includes(u.id) &&
      friendIds.has(u.id)
  );

  const handleAdd = async () => {
    if (selectedUsers.length === 0 || !selectedConversation || !currentUser) return;

    setLoading(true);
    try {
      await addParticipants(selectedConversation, selectedUsers);
      onClose();
    } catch (error) {
      console.error('Failed to add participants:', error);
      alert('Failed to add participants');
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Add Participants</h3>
          <button onClick={onClose} className="modal-close">
            <X />
          </button>
        </div>

        <div className="modal-description">
          {selectedUsers.length === 0
            ? 'Select users to add to this conversation'
            : `${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} selected`}
        </div>

        <div className="user-list">
          {availableUsers.length === 0 ? (
            <p className="user-list-empty">No friends available to add</p>
          ) : (
            availableUsers.slice(0, visibleCount).map(user => (
              <div
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className="user-item"
              >
                <Avatar name={user.username} size="md" />
                <div className="user-info">
                  <p className="user-name">{user.username}</p>
                  <p className="user-subtitle">{user.name}</p>
                </div>
                {selectedUsers.includes(user.id) && (
                  <Check className="user-check" />
                )}
              </div>
            ))
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
          onClick={handleAdd}
          disabled={selectedUsers.length === 0 || loading}
          className="btn-full"
        >
          {loading ? 'Adding...' : 'Add Participants'}
        </Button>
      </div>
    </div>
  );
}