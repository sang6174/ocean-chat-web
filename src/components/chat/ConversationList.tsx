import { useState, useRef, useEffect } from 'react';
import { Search, Plus, LogOut, Bell } from 'lucide-react';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { Avatar } from '../../components/common/Avatar';
import type { Conversation } from '../../types/chat.types';

interface ConversationListProps {
  onNewChat: () => void;
}

export function ConversationList({ onNewChat }: ConversationListProps) {
  const { logout, currentUser } = useAuth();
  const { conversations, selectedConversation, selectConversation, notifications } = useChat();
  console.log('ConversationList render:', { conversationsLength: conversations?.length, notificationsLength: notifications?.length });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationWrapperRef.current &&
        !notificationWrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'group') {
      return conv.metadata.name;
    }
    const otherUser = conv.participants.find(p => p.id !== currentUser?.id);
    return otherUser?.username || conv.participants[0]?.username || 'Unknown';
  };

  const filteredConversations = conversations.filter(conv =>
    getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="conversation-list">
      <div className="conversation-header" style={{ position: 'relative' }}>
        <div className="conversation-header-top">
          <h2 className="conversation-title">Ocean Chat</h2>
          <div className="conversation-actions">
            <div className="notification-wrapper" ref={notificationWrapperRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`icon-button relative`}
                style={{
                  position: 'relative',
                  backgroundColor: showNotifications ? 'var(--ocean-100)' : 'transparent',
                  color: showNotifications ? 'var(--ocean-700)' : 'inherit'
                }}
              >
                <Bell />
                {notifications.length > 0 && (
                  <span className="notification-badge-count">{notifications.length}</span>
                )}
              </button>

            </div>
            <button onClick={onNewChat} className="icon-button">
              <Plus />
            </button>
            <button onClick={logout} className="icon-button">
              <LogOut />
            </button>
          </div>
        </div>

        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {showNotifications && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '3.5rem',
              left: 0,
              width: '100%',
              zIndex: 50,
              padding: '0 var(--space-4)'
            }}
          >
            <NotificationDropdown
              notifications={notifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>
        )}
      </div>

      <div className="conversation-list-container">
        {filteredConversations.length === 0 ? (
          <div className="conversation-empty">
            <p>No conversations yet</p>
            <button onClick={onNewChat}>
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`conversation-item ${selectedConversation === conv.id ? 'active' : ''}`}
            >
              <div className="conversation-item-content">
                <Avatar name={getConversationName(conv)} size="lg" />
                <div className="conversation-info">
                  <h3 className="conversation-name">
                    {getConversationName(conv)}
                  </h3>
                  <p className="conversation-last-message">
                    {conv.lastMessage?.message || 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div >
  );
}