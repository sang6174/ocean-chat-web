import { useState, useRef, useEffect } from 'react';
import { Search, MessageSquarePlus, UserRoundPlus, LogOut, Bell } from 'lucide-react';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { UserProfileModal } from '../modals/UserProfileModal';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { Avatar } from '../../components/common/Avatar';
import type { Conversation } from '../../types/chat.types';

interface ConversationListProps {
  onNewGroupChat: () => void;
  onAddFriend: () => void;
}

export function ConversationList({ onNewGroupChat, onAddFriend }: ConversationListProps) {
  const { logout, currentUser } = useAuth();
  const {
    conversations,
    selectedConversation,
    selectConversation,
    notifications,
    users,
    markAllNotificationsAsRead
  } = useChat();
  console.log('ConversationList render:', { conversationsLength: conversations?.length, notificationsLength: notifications?.length });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
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

  // Track when notifications change to show badge
  useEffect(() => {
    if (notifications.length > 0) {
      // Check if there are any unread notifications using the server-side isRead flag
      const hasNewNotifications = notifications.some(n => !n.isRead);
      setHasUnreadNotifications(hasNewNotifications);
    } else {
      setHasUnreadNotifications(false);
    }
  }, [notifications]);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && hasUnreadNotifications) {
      // When opening notifications, mark all current ones as read on the server
      markAllNotificationsAsRead();
      setHasUnreadNotifications(false);
    }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'group') {
      return conv.name;
    }
    const otherParticipant = conv.participants.find(p => p.userId !== currentUser?.id);
    const participantToName = otherParticipant || conv.participants[0];

    if (!participantToName) return 'Unknown';

    // If username is valid, use it
    if (participantToName.username && participantToName.username !== 'Unknown') {
      return participantToName.username;
    }

    // Fallback: try to find user in global users list
    const foundUser = users.find(u => u.id === participantToName.userId);
    return foundUser?.username || 'Unknown';
  };

  const filteredConversations = conversations.filter(conv =>
    getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="conversation-list">
      <div className="conversation-header" style={{ position: 'relative' }}>
        <div className="conversation-header-top">
          <div className="header-user-section" onClick={() => setShowProfile(true)} title="View Profile">
            <Avatar name={currentUser?.username || 'User'} size="sm" />
            <h2 className="conversation-title">Ocean Chat</h2>
          </div>

          <div className="conversation-actions">
            <div className="action-group social-actions">
              <button onClick={onAddFriend} className="icon-button" title="Add Friend">
                <UserRoundPlus />
              </button>
              <button onClick={onNewGroupChat} className="icon-button" title="Create Group Chat">
                <MessageSquarePlus />
              </button>
            </div>

            <div className="action-divider" />

            <div className="action-group system-actions">
              <div className="notification-wrapper" ref={notificationWrapperRef} style={{ position: 'relative' }}>
                <button
                  onClick={handleBellClick}
                  className={`icon-button relative`}
                  style={{
                    backgroundColor: showNotifications ? 'var(--ocean-100)' : 'transparent',
                    color: showNotifications ? 'var(--ocean-700)' : 'inherit'
                  }}
                  title="Notifications"
                >
                  <Bell />
                  {hasUnreadNotifications && notifications.length > 0 && (
                    <span className="notification-badge-count">{notifications.length}</span>
                  )}
                </button>
              </div>
              <button onClick={logout} className="icon-button" title="Log Out">
                <LogOut />
              </button>
            </div>
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
            />
          </div>
        )}
      </div>

      <div className="conversation-list-container">
        {filteredConversations.length === 0 ? (
          <div className="conversation-empty">
            <p>No conversations yet</p>
            <button onClick={onNewGroupChat}>
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
                    {conv.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showProfile && (
        <UserProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div >
  );
}