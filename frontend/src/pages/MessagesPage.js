import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Image,
  Video,
  FileText,
  Smile,
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  Bot,
  Trash2,
  Download,
  MessageSquare,
  Youtube,
  BookOpen,
  Layers,
  ExternalLink,
  Share2,
  PlayCircle
} from 'lucide-react';
import { messagesAPI, friendsAPI, youtubeAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import '../index.css';

const MessagesPage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();

  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🙌', '🤝', '💪'];
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [smartReplies] = useState([]);
  const [friendInfo, setFriendInfo] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Get friend details
  const { } = useQuery(
    ['friend', friendId],
    () => friendsAPI.getFriends().then(response => {
      const friends = response.data;
      return friends.find(friend => (friend.id || friend._id) === friendId);
    }),
    {
      enabled: !!friendId,
      onSuccess: (friend) => {
        if (friend) {
          setFriendInfo(friend);
        }
      }
    }
  );

  // Create or get conversation
  const { isLoading: conversationLoading } = useQuery(
    ['conversation', friendId],
    () => messagesAPI.createOrGetConversation(friendId),
    {
      enabled: !!friendId,
      onSuccess: (data) => {
        setConversationId(data.data.conversation_id);
      },
      onError: (error) => {
        console.error('Failed to create conversation:', error);
        toast.error('Failed to start conversation');
      }
    }
  );

  // Get messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery(
    ['messages', conversationId],
    () => messagesAPI.getMessages(conversationId),
    {
      enabled: !!conversationId,
      refetchInterval: 3000, // Poll for new messages every 3 seconds
      select: (response) => {
        console.log('Raw messages response:', response);
        const data = response.data;

        // Filter out any error objects that might be in the response
        if (Array.isArray(data)) {
          const filteredData = data.filter(item => {
            // Must have an ID
            if (!item || (!item.id && !item._id)) return false;
            // Filter out specific error patterns
            if (item.type && item.loc && item.msg) {
              console.warn('Filtering out error object from messages:', item);
              return false;
            }
            return true;
          });
          console.log('Filtered messages:', filteredData);
          return filteredData;
        }

        return data || [];
      },
      onError: (error) => {
        console.error('Failed to get messages:', error);
        toast.error('Failed to load messages');
      }
    }
  );

  // Send message mutation (wrap to accept { conversationId, formData })
  const sendMessageMutation = useMutation(
    ({ conversationId, formData }) => messagesAPI.sendMessage(conversationId, formData),
    {
      onSuccess: (response) => {
        console.log('Message sent successfully:', response);
        setMessage('');
        setSelectedFile(null);
        refetchMessages();
        scrollToBottom();
      },
      onError: (error) => {
        console.error('Send message error:', error);

        // Handle different error formats
        let errorMessage = 'Failed to send message';

        if (error.response?.data) {
          const errorData = error.response.data;

          // Handle FastAPI validation errors
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => {
              if (typeof err === 'object' && err.msg) {
                return err.msg;
              }
              return String(err);
            }).join(', ');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error(errorMessage);
      },
    }
  );

  // Delete message mutation
  const deleteMessageMutation = useMutation(messagesAPI.deleteMessage, {
    onSuccess: () => {
      refetchMessages();
      toast.success('Message deleted');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.detail
        ? (typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : 'Failed to delete message')
        : 'Failed to delete message';
      toast.error(errorMessage);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim() && !selectedFile) return;
    if (!conversationId) return;

    const formData = new FormData();
    formData.append('content', message);

    if (selectedFile) {
      formData.append('file', selectedFile);

      // Set message type based on file type
      if (selectedFile.type.startsWith('image/')) {
        formData.append('message_type', 'image');
      } else if (selectedFile.type.startsWith('video/')) {
        formData.append('message_type', 'video');
      } else if (selectedFile.type.startsWith('audio/')) {
        formData.append('message_type', 'audio');
      } else {
        formData.append('message_type', 'file');
      }
    } else {
      formData.append('message_type', 'text');
    }

    sendMessageMutation.mutate({ conversationId, formData });
  };

  const handleFileSelect = (type) => {
    const input = fileInputRef.current;
    if (type === 'image') {
      input.accept = 'image/*';
    } else if (type === 'video') {
      input.accept = 'video/*';
    } else {
      input.accept = '*/*';
    }
    input.click();
    setShowAttachMenu(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus'
        });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const audioFile = new File([audioBlob], `voice_message_${timestamp}.webm`, {
          type: 'audio/webm'
        });
        setSelectedFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
        toast.success('Voice message recorded!');
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      toast.success('Recording started...');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const formatTime = (timestamp) => {
    try {
      // handle various timestamp shapes (string, number, or object from backend)
      if (!timestamp) return '';
      if (typeof timestamp === 'object') {
        // try common mongo date wrapper
        const maybe = timestamp.$date || timestamp.date || timestamp;
        return new Date(maybe).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render shared content based on type
  const renderSharedContent = (sharedContent, isOwnMessage) => {
    if (!sharedContent) return null;

    const contentType = sharedContent.content_type;

    // Get the appropriate icon and colors based on content type
    const getContentStyle = () => {
      switch (contentType) {
        case 'youtube_summary':
        case 'youtube_video':
          return {
            icon: <Youtube className="w-4 h-4 text-red-500" />,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            label: 'YouTube Summary'
          };
        case 'youtube_session':
          return {
            icon: <PlayCircle className="w-4 h-4 text-red-600" />,
            bgColor: 'bg-gradient-to-br from-red-50 to-orange-50',
            borderColor: 'border-red-300',
            label: 'YouTube Session'
          };
        case 'flashcards':
          return {
            icon: <BookOpen className="w-4 h-4 text-purple-500" />,
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            label: 'Flashcards'
          };
        case 'slides':
          return {
            icon: <Layers className="w-4 h-4 text-blue-500" />,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            label: 'Slides'
          };
        case 'notes':
          return {
            icon: <FileText className="w-4 h-4 text-green-500" />,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            label: 'Notes'
          };
        case 'ai_chat':
          return {
            icon: <Bot className="w-4 h-4 text-indigo-500" />,
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200',
            label: 'AI Chat'
          };
        default:
          return {
            icon: <Share2 className="w-4 h-4 text-gray-500" />,
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            label: 'Shared Content'
          };
      }
    };

    // Handle import session
    const handleImportSession = async () => {
      if (!sharedContent.source_id) {
        toast.error('Session ID not available');
        return;
      }

      try {
        toast.loading('Importing session...', { id: 'import-session' });
        const response = await youtubeAPI.importSession(sharedContent.source_id);
        toast.dismiss('import-session');

        if (response.data.already_owned) {
          toast.success('Opening your session...');
          navigate(`/youtube-summarizer?session=${sharedContent.source_id}`);
        } else if (response.data.already_imported || response.data.imported) {
          toast.success('Session imported! Opening...');
          navigate(`/youtube-summarizer?session=${response.data.session_id}`);
        }
      } catch (error) {
        toast.dismiss('import-session');
        console.error('Import error:', error);
        toast.error('Failed to import session');
      }
    };

    const style = getContentStyle();

    return (
      <div className={`rounded-lg border ${style.borderColor} ${style.bgColor} p-3 max-w-xs mb-2`}>
        {/* Preview Image */}
        {sharedContent.preview_image_url && (
          <img
            src={sharedContent.preview_image_url}
            alt={sharedContent.title}
            className="w-full h-24 object-cover rounded-lg mb-2"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        {/* Type Badge */}
        <div className="flex items-center gap-2 mb-2">
          {style.icon}
          <span className="text-xs font-medium text-gray-500">{style.label}</span>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
          {sharedContent.title}
        </h4>

        {/* Description */}
        {sharedContent.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {sharedContent.description}
          </p>
        )}

        {/* Flashcards Preview */}
        {contentType === 'flashcards' && sharedContent.metadata?.total_count && (
          <div className="text-xs text-purple-600 font-medium">
            📚 {sharedContent.metadata.total_count} flashcards
          </div>
        )}

        {/* Slides Preview */}
        {contentType === 'slides' && sharedContent.metadata?.total_slides && (
          <div className="text-xs text-blue-600 font-medium">
            🎴 {sharedContent.metadata.total_slides} slides
          </div>
        )}

        {/* YouTube Session Preview */}
        {contentType === 'youtube_session' && sharedContent.metadata && (
          <div className="flex flex-wrap gap-2 text-xs mb-2">
            {sharedContent.metadata.has_chat && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                💬 {sharedContent.metadata.chat_count} chats
              </span>
            )}
            {sharedContent.metadata.has_flashcards && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                📚 {sharedContent.metadata.flashcards_count} cards
              </span>
            )}
            {sharedContent.metadata.has_slides && (
              <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full">
                🎴 Slides
              </span>
            )}
          </div>
        )}

        {/* Import & Open Button for YouTube Sessions */}
        {contentType === 'youtube_session' && sharedContent.source_id && (
          <button
            onClick={handleImportSession}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Import & Open
          </button>
        )}

        {/* Source Link */}
        {sharedContent.source_url && contentType !== 'youtube_session' && (
          <a
            href={sharedContent.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            View Original
          </a>
        )}
      </div>
    );
  };

  const renderMessage = (msg, index) => {
    // Comprehensive safety checks
    if (!msg) {
      console.warn('Null/undefined message:', msg);
      return null;
    }

    if (typeof msg !== 'object') {
      console.warn('Non-object message:', msg);
      return null;
    }

    // Check for error objects (FastAPI validation errors)
    if (msg.type && msg.loc && msg.msg && msg.input !== undefined) {
      console.warn('Error object detected in messages:', msg);
      return null;
    }

    // Check for valid message structure
    if (!msg.id && !msg._id) {
      console.warn('Message without ID:', msg);
      return null;
    }

    // Additional check for any object that looks like an error
    if (msg.msg && msg.type && msg.loc) {
      console.warn('Potential error object in messages:', msg);
      return null;
    }

    const isOwnMessage = Boolean(msg.is_own_message);
    const isAI = Boolean(msg.is_ai_response);

    return (
      <motion.div
        key={String(msg.id)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isAI
          ? 'bg-purple-100 border border-purple-200'
          : isOwnMessage
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
          }`}>

          {/* AI Badge */}
          {isAI && (
            <div className="flex items-center gap-1 mb-1">
              <Bot className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-600">AI Assistant</span>
            </div>
          )}

          {/* Shared Content */}
          {msg.message_type === 'shared_content' && msg.shared_content && (
            renderSharedContent(msg.shared_content, isOwnMessage)
          )}

          {/* File/Media Content */}
          {msg.file_url && (
            <div className="mb-2">
              {msg.message_type === 'image' && (
                <img
                  src={`http://localhost:8000${msg.file_url}`}
                  alt={safeText(msg.file_name)}
                  className="max-w-full h-auto rounded-lg cursor-pointer"
                  onClick={() => window.open(`http://localhost:8000${msg.file_url}`, '_blank')}
                />
              )}

              {msg.message_type === 'video' && (
                <video
                  controls
                  className="max-w-full h-auto rounded-lg"
                  src={`http://localhost:8000${msg.file_url}`}
                />
              )}

              {msg.message_type === 'audio' && (
                <audio
                  controls
                  className="w-full"
                  src={`http://localhost:8000${msg.file_url}`}
                />
              )}

              {msg.message_type === 'file' && (
                <div className="flex items-center gap-2 p-2 bg-white bg-opacity-20 rounded">
                  <FileText className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{safeText(msg.file_name)}</p>
                    <p className="text-xs opacity-75">{formatFileSize(msg.file_size)}</p>
                  </div>
                  <button
                    onClick={() => window.open(`http://localhost:8000${msg.file_url}`, '_blank')}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Message Text */}
          {msg.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{safeText(msg.content)}</p>
          )}

          {/* Message Info */}
          <div className={`flex items-center justify-between mt-1 text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'
            }`}>
            <span>{formatTime(msg.timestamp)}</span>

            <div className="flex items-center gap-1">
              {isOwnMessage && !isAI && (
                <button
                  onClick={() => deleteMessageMutation.mutate(String(msg.id))}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white hover:bg-opacity-20 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              {isOwnMessage && (
                msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Fetch friends for inbox view
  const { data: friends = [] } = useQuery(
    'friends-inbox',
    () => friendsAPI.getFriends().then(res => res.data),
    {
      enabled: !friendId // Only fetch when showing inbox
    }
  );

  // Show inbox view when no friend is selected
  if (!friendId) {
    return (
      <div className="h-full bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

          {friends.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500">Add friends to start messaging them!</p>
              <button
                onClick={() => navigate('/friends')}
                className="mt-4 btn-primary"
              >
                Go to Friends
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {friends.map((friend) => {
                const friendId = friend.id || friend._id;
                const friendName = friend.name || friend.full_name || 'Friend';
                const friendAvatar = friendName.charAt(0).toUpperCase();

                return (
                  <button
                    key={friendId}
                    onClick={() => navigate(`/messages/${friendId}`)}
                    className="w-full p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {friendAvatar}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{friendName}</h3>
                      <p className="text-sm text-gray-500">Click to start conversation</p>
                    </div>
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (conversationLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/friends')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {safeText(friendInfo?.name || friendInfo?.full_name)?.charAt(0) || 'F'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {safeText(friendInfo?.name || friendInfo?.full_name) || 'Friend'}
              </h2>
            </div>
          </div>
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(() => {
          try {
            if (messages.length === 0) {
              return (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                  <p className="text-gray-500">Send your first message to get started!</p>
                  <p className="text-sm text-gray-400 mt-2">
                    💡 Try typing <span className="font-mono bg-gray-100 px-1 rounded">@AI</span> to get help from our AI assistant
                  </p>
                </div>
              );
            }

            const validMessages = messages.filter(msg => {
              // Ensure message is an object and has an ID
              if (!msg || typeof msg !== 'object') return false;
              if (!msg.id && !msg._id) return false;

              // Filter out error objects
              if (msg.type && msg.loc && msg.msg) return false;

              return true;
            });

            console.log('Valid messages to render:', validMessages);

            return validMessages.map((msg, index) => {
              try {
                console.log('Rendering message:', msg);
                return renderMessage(msg, index);
              } catch (error) {
                console.error('Error rendering message:', error, msg);
                return null;
              }
            }).filter(Boolean);
          } catch (error) {
            console.error('Error in messages rendering:', error);
            return (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading messages</h3>
                <p className="text-gray-500">There was an error loading the conversation.</p>
              </div>
            );
          }
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          {/* Attachment Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg border p-2 z-10"
                >
                  <button
                    type="button"
                    onClick={() => handleFileSelect('image')}
                    className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 rounded text-left"
                  >
                    <Image className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Photos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFileSelect('video')}
                    className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 rounded text-left"
                  >
                    <Video className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Videos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFileSelect('file')}
                    className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 rounded text-left"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Documents</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message Input */}
          <div className="top-2.5 flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isRecording ? "Recording voice message..." : "Type a message... (use @AI for AI help)"}
              className={` mt-2.5 w-full p-3 pr-12 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRecording ? 'bg-red-50 border-red-300' : ''
                }`}
              rows={1}
              disabled={isRecording}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isRecording) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />

            {!isRecording && (
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <Smile className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Voice Recording / Send Button */}
          {message.trim() || selectedFile ? (
            <button
              type="submit"
              disabled={sendMessageMutation.isLoading || isRecording}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendMessageMutation.isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition-all duration-200 ${isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 hover:shadow-md'
                }`}
              title={isRecording ? "Stop recording" : "Start voice recording"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
        </div>
      </form>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg border p-3 z-20"
          >
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default MessagesPage;
