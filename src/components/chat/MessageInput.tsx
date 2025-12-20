import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useChat } from '../../hooks/useChat';

export function MessageInput() {
  const { selectedConversation, sendMessage } = useChat();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSend = async () => {
    if (!message.trim() || !selectedConversation) return;

    try {
      await sendMessage({
        conversationId: selectedConversation,
        message: message.trim(),
      });
      setMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setMessage(prev => prev + emojiObject.emoji);
  };

  return (
    <div className="message-input-container">
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '20px',
            zIndex: 100
          }}
        >
          <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
        </div>
      )}
      <div className="message-input-wrapper">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="icon-button"
          style={{ marginRight: '8px' }}
        >
          <Smile className={showEmojiPicker ? "text-primary" : ""} />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="message-input"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="message-send-button"
        >
          <Send />
        </button>
      </div>
    </div>
  );
}