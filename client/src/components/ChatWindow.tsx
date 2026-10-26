import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Send, X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export interface OnlineStatus {
  isOnline: boolean;
  label: string;
}

export function formatOnlineStatus(isOnline?: boolean, lastActive?: string | Date | null): OnlineStatus {
  if (isOnline) {
    return { isOnline: true, label: 'Online' };
  }
  if (!lastActive) {
    return { isOnline: false, label: 'Recently' };
  }

  const then = new Date(lastActive).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) {
    return { isOnline: false, label: 'Active just now' };
  }
  if (diffMinutes < 60) {
    return { isOnline: false, label: `Active ${diffMinutes}m ago` };
  }
  if (diffHours <= 12) {
    return { isOnline: false, label: `Active ${diffHours}h ago` };
  }
  return { isOnline: false, label: 'Recently' };
}

interface ChatWindowProps {
  receiverId: string;
  receiverName: string;
  connectionStatus: 'pending' | 'accepted';
  receiverLastActive?: string;
  onClose: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function ChatWindow({ 
  receiverId, 
  receiverName, 
  connectionStatus, 
  receiverLastActive,
  onClose 
}: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Presence State
  const [isReceiverOnline, setIsReceiverOnline] = useState(false);
  const [lastActive, setLastActive] = useState<string | undefined>(receiverLastActive);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Count messages sent by me
  const sentByMeCount = messages.filter(m => m.sender_id === user?.id).length;
  const isMessageRestricted = connectionStatus === 'pending' && sentByMeCount >= 1;

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/connections/messages/${receiverId}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Socket io initialization
    socketRef.current = io(window.location.origin);
    if (user) {
      socketRef.current.emit('join', user.id);
    }

    // Listen to online users list
    socketRef.current.on('online_users_list', (onlineUserIds: string[]) => {
      if (onlineUserIds.includes(receiverId)) {
        setIsReceiverOnline(true);
      }
    });

    // Listen to real-time presence changes
    socketRef.current.on('user_presence', (data: { userId: string; isOnline: boolean; lastActive?: string }) => {
      if (data.userId === receiverId) {
        setIsReceiverOnline(data.isOnline);
        if (data.lastActive) {
          setLastActive(data.lastActive);
        }
      }
    });

    // Receive message
    socketRef.current.on('receive_message', (data: any) => {
      if (data.sender_id === receiverId) {
        setMessages((prev) => [...prev, data]);
        setIsReceiverOnline(true);
      }
    });

    // Heartbeat every 25 seconds
    const heartbeat = setInterval(() => {
      if (socketRef.current && user) {
        socketRef.current.emit('heartbeat', user.id);
      }
    }, 25000);

    return () => {
      clearInterval(heartbeat);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onlineStatus = formatOnlineStatus(isReceiverOnline, lastActive);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isMessageRestricted) return;

    try {
      setErrorMsg(null);
      const res = await axios.post('/api/connections/message', {
        receiver_id: receiverId,
        content: newMessage,
      });

      const msg = res.data.message;
      setMessages((prev) => [...prev, msg]);
      
      // Emit via socket
      if (socketRef.current) {
        socketRef.current.emit('send_message', msg);
      }

      setNewMessage('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to send message.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 sm:absolute sm:inset-auto sm:bottom-20 sm:right-6 sm:h-[480px] sm:w-96 sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950 px-4 py-3">
        <div>
          <h3 className="font-semibold text-white text-sm">{receiverName}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`h-2 w-2 rounded-full ${
                onlineStatus.isOnline
                  ? 'bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                onlineStatus.isOnline ? 'text-emerald-400' : 'text-zinc-400'
              }`}
            >
              {onlineStatus.label}
            </span>
            <span className="text-zinc-600 text-[10px]">•</span>
            <span className="text-[10px] text-zinc-500">
              {connectionStatus === 'accepted' ? 'Connected' : 'Pending connection request'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-zinc-950/40">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <p className="text-xs text-zinc-500">No messages yet. Send a friendly note to say hi!</p>
            {connectionStatus === 'pending' && (
              <span className="mt-2 text-[10px] text-rose-400/80 max-w-[200px]">
                Note: You can only send 1 message before they accept your request.
              </span>
            )}
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isMe 
                      ? 'bg-rose-500 text-white rounded-tr-none' 
                      : 'bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800/50'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 bg-rose-950/50 border-t border-rose-900 px-4 py-1.5 text-[10px] text-rose-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-zinc-900 bg-zinc-950 p-3">
        {isMessageRestricted ? (
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5 text-center text-[10px] text-zinc-400">
            You cannot send another message until {receiverName} accepts your connection request.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={connectionStatus === 'pending' ? "Send your introductory message..." : "Type a message..."}
              className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="rounded-xl bg-rose-500 p-2 text-white hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
