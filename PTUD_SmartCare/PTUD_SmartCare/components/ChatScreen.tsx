import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendChatToHealthAssistant } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';

export const ChatScreen = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: `Xin chào ${user?.name || 'bạn'}! Tôi là trợ lý AI của SmartCare. Bạn cảm thấy trong người thế nào?`,
      sender: 'bot',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Call Backend Service
      const botReplyText = await sendChatToHealthAssistant(userMsg.text, { 
        name: user?.name || '', 
        condition: user?.medicalCondition 
      });

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botReplyText,
        sender: 'bot',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Xin lỗi, hiện tại tôi không thể phản hồi. Vui lòng thử lại sau.",
        sender: 'bot',
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-gray-50 -mx-4 -my-8 pt-8">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex max-w-[80%] gap-2 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isBot ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-500'}`}>
                  {isBot ? <Bot className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                </div>

                {/* Bubble */}
                <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isBot 
                    ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' 
                    : 'bg-primary-600 text-white rounded-tr-none'
                } ${msg.isError ? 'bg-red-50 border-red-200 text-red-600' : ''}`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-[80%] gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-t border-gray-100 flex items-center gap-2 sticky bottom-0 z-10">
        <div className="flex-1 relative">
            <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Hỏi về sức khỏe của bạn..."
            className="w-full bg-gray-100 pl-4 pr-10 py-3 rounded-full outline-none focus:ring-2 focus:ring-primary-300 transition-all text-sm"
            disabled={isTyping}
            />
            <Sparkles className="w-4 h-4 text-primary-500 absolute right-3 top-3.5 opacity-50" />
        </div>
        
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          className="p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
           {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};