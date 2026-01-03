import { UserPlus } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';

interface ChatHeaderProps {
  onAddParticipants: () => void;
}

export function ChatHeader({ onAddParticipants }: ChatHeaderProps) {
  const { conversations, selectedConversation, users } = useChat();
  const { currentUser } = useAuth();

  const conversation = conversations.find(c => c.id === selectedConversation);

  if (!conversation) return null;

  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name;
    }
    const otherParticipant = conversation.participants.find(p => p.userId !== currentUser?.id);
    const participantToName = otherParticipant || conversation.participants[0];

    if (!participantToName) return 'Unknown';

    if (participantToName.username && participantToName.username !== 'Unknown') {
      return participantToName.username;
    }

    // Fallback using global user list
    const foundUser = users.find(u => u.id === participantToName.userId);
    return foundUser?.username || 'Unknown';
  };

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <Avatar name={getConversationName()} />
        <div>
          <h3 className="chat-header-title">{getConversationName()}</h3>
          <p className="chat-header-subtitle">
            {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {conversation.type === 'group' && (
        (() => {
          const myParticipant = conversation.participants.find(p => p.userId === currentUser?.id);
          const isAdmin = myParticipant?.role === 'admin';

          if (!isAdmin) return null;

          return (
            <Button variant="secondary" onClick={onAddParticipants}>
              <UserPlus style={{ width: '1rem', height: '1rem' }} />
              Add Members
            </Button>
          );
        })()
      )}
    </div>
  );
}