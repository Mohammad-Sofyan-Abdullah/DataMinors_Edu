import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MoreVertical,
  Edit3,
  Trash2,
  FileText,
  Sparkles,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { chatAPI } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
// import { useAuth } from '../contexts/AuthContext'; // Removed unused import
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import Button from './Button';

const ChatInterface = ({ room, classroom, user }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const { socket, connected } = useSocket();

  // Fetch messages
  const { data: initialMessages = [], isLoading } = useQuery(
    ['messages', room.id || room._id],
    () => chatAPI.getMessages(room.id || room._id),
    {
      select: (response) => response.data,
      enabled: !!(room.id || room._id),
    }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    ({ roomId, content }) => chatAPI.sendMessage(roomId, content),
    {
      onSuccess: (response) => {
        console.log('Message sent successfully:', response);
        // Optimistically add the message to the UI
        const newMessage = response.data;
        setMessages(prev => [...prev, newMessage]);
        // Also invalidate to refetch in case there are differences
        queryClient.invalidateQueries(['messages', room.id || room._id]);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to send message');
        }
      },
    }
  );

  // Edit message mutation
  const editMessageMutation = useMutation(
    ({ messageId, content }) => chatAPI.editMessage(messageId, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['messages', room.id || room._id]);
        setEditingMessage(null);
        setEditContent('');
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to edit message');
        }
      },
    }
  );

  // Delete message mutation
  const deleteMessageMutation = useMutation(chatAPI.deleteMessage, {
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', room.id || room._id]);
      setShowMessageMenu(null);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.detail;
      if (typeof errorMessage === 'string') {
        toast.error(errorMessage);
      } else if (Array.isArray(errorMessage)) {
        const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
        toast.error(messages);
      } else {
        toast.error('Failed to delete message');
      }
    },
  });

  // Summarize chat mutation
  const summarizeMutation = useMutation(
    () => chatAPI.summarizeChat(room.id || room._id),
    {
      onSuccess: (response) => {
        setSummary(response.data.summary);
        setIsLoadingSummary(false);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to generate summary');
        }
        setIsLoadingSummary(false);
      },
    }
  );

  // Update messages when initial data loads
  useEffect(() => {
    console.log('Initial messages loaded:', initialMessages);
    setMessages(initialMessages);
  }, [initialMessages]);

  // Debug: Log messages state changes
  useEffect(() => {
    console.log('Messages state updated:', messages);
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      console.log('Received new_message event:', data);
      setMessages(prev => [...prev, data.message]);
    };

    const handleMessageEdited = (data) => {
      console.log('Received message_edited event:', data);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.message.id || msg._id === data.message._id ? data.message : msg
        )
      );
    };

    const handleMessageDeleted = (data) => {
      console.log('Received message_deleted event:', data);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.message_id || msg._id === data.message_id ? { ...msg, deleted: true } : msg
        )
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !connected) return;

    sendMessageMutation.mutate({
      roomId: room.id || room._id,
      content: message.trim(),
    });
    setMessage('');
  };

  const handleEditMessage = (msg) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
    setShowMessageMenu(null);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || !editingMessage) return;
    editMessageMutation.mutate({
      messageId: editingMessage._id || editingMessage.id,
      content: editContent.trim(),
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const handleGenerateSummary = () => {
    setIsLoadingSummary(true);
    setShowSummary(true);
    summarizeMutation.mutate();
  };

  const canEditMessage = (msg) => {
    return msg.sender_id === user?.id && !msg.deleted;
  };

  const canDeleteMessage = (msg) => {
    return msg.sender_id === user?.id && !msg.deleted;
  };

  const safeText = (val) => {
    if (val === null || val === undefined) return '';
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') return String(val);
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Room header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-lg font-medium text-gray-900">{room.name}</h2>
          {room.description && (
            <p className="text-sm text-gray-600">{room.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleGenerateSummary}
            disabled={isLoadingSummary}
            variant="outline"
            size="sm"
            isLoading={isLoadingSummary}
            leftIcon={!isLoadingSummary && <Sparkles className="h-4 w-4" />}
          >
            Summarize
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start the conversation by sending a message below
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg._id || msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`relative group max-w-xs lg:max-w-md ${msg.deleted ? 'opacity-50' : ''}`}>
                {(editingMessage?.id === msg.id || editingMessage?._id === msg._id) ? (
                  <div className="bg-white border border-gray-300 rounded-lg p-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full resize-none border-none outline-none text-sm"
                      rows="2"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button
                        onClick={() => {
                          setEditingMessage(null);
                          setEditContent('');
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-500 hover:text-gray-700 h-auto py-1 px-2"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim() || editMessageMutation.isLoading}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary-600 hover:text-primary-700 h-auto py-1 px-2"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-lg p-3 ${msg.sender_id === user?.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                      }`}
                  >
                    {msg.deleted ? (
                      <p className="text-sm italic">This message was deleted</p>
                    ) : (
                      <>
                        <p className="text-sm">{safeText(msg.content)}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs opacity-75">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                          {msg.edited && (
                            <span className="text-xs opacity-75">(edited)</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Message menu */}
                {!msg.deleted && (canEditMessage(msg) || canDeleteMessage(msg)) && (
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowMessageMenu(showMessageMenu === (msg._id || msg.id) ? null : (msg._id || msg.id))}
                      className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    {showMessageMenu === (msg._id || msg.id) && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        {canEditMessage(msg) && (
                          <button
                            onClick={() => handleEditMessage(msg)}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                        )}
                        {canDeleteMessage(msg) && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id || msg.id)}
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={!connected}
            className="input flex-1"
          />
          <Button
            type="submit"
            disabled={!message.trim() || !connected || sendMessageMutation.isLoading}
            isLoading={sendMessageMutation.isLoading}
            size="md"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Summary modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowSummary(false)} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Chat Summary</h3>
                    <Button
                      onClick={() => setShowSummary(false)}
                      variant="ghost"
                      className="text-gray-400 hover:text-gray-600 h-auto p-1"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingSummary ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;


