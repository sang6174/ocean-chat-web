import { Users } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatAreaProps {
  onAddParticipants: () => void;
}

export function ChatArea({ onAddParticipants }: ChatAreaProps) {
  const { selectedConversation } = useChat();

  if (!selectedConversation) {
    return (
      <div className="chat-area">
        <div className="chat-empty">
          <div className="chat-empty-content">
            <Users className="chat-empty-icon" />
            <p className="chat-empty-text">Select a conversation to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <ChatHeader onAddParticipants={onAddParticipants} />
      <MessageList />
      <MessageInput />
    </div>
  );
}