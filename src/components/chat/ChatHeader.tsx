import { UserPlus } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';

interface ChatHeaderProps {
  onAddParticipants: () => void;
}

export function ChatHeader({ onAddParticipants }: ChatHeaderProps) {
  const { conversations, selectedConversation } = useChat();
  const { currentUser } = useAuth();

  const conversation = conversations.find(c => c.id === selectedConversation);

  if (!conversation) return null;

  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.metadata.name;
    }
    const otherUser = conversation.participants.find(p => p.userId !== currentUser?.id);
    return otherUser?.username || conversation.participants[0]?.username || 'Unknown';
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
        <Button variant="secondary" onClick={onAddParticipants}>
          <UserPlus style={{ width: '1rem', height: '1rem' }} />
          Add Members
        </Button>
      )}
    </div>
  );
}