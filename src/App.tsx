import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ConversationList } from './components/chat/ConversationList';
import { ChatArea } from './components/chat/ChatArea';
import { NewChatModal } from './components/modals/NewChatModal';
import { AddParticipantsModal } from './components/modals/AddParticipantsModal';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAddParticipants, setShowAddParticipants] = useState(false);

  if (!isAuthenticated) {
    return authMode === 'login' ? (
      <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <ChatProvider>
      <div className="chat-container">
        <ConversationList onNewChat={() => setShowNewChat(true)} />
        <ChatArea onAddParticipants={() => setShowAddParticipants(true)} />

        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
        {showAddParticipants && <AddParticipantsModal onClose={() => setShowAddParticipants(false)} />}
      </div>
    </ChatProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}