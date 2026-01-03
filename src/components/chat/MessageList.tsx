import React, { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';

export function MessageList() {
  const { messages } = useChat();
  const { currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="message-list-empty">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map(msg => {
          // System messages have no sender ID (null or empty string)
          const isSystemMessage = !msg.sender?.id || msg.sender.id === '';

          if (isSystemMessage) {
            return (
              <div key={msg.id} className="system-message">
                <span className="system-message-content">{msg.content}</span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`message-wrapper ${msg.sender.id === currentUser?.id ? 'sent' : 'received'}`}
            >
              <div className={`message-bubble ${msg.sender.id === currentUser?.id ? 'sent' : 'received'}`}>
                {msg.sender.id !== currentUser?.id && (
                  <p className="message-sender">{msg.sender.username}</p>
                )}
                <p className="message-text">{msg.content}</p>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}