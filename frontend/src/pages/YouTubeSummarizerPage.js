import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Download, 
  RefreshCw, 
  Trash2, 
  Youtube, 
  FileText,
  Loader2,
  Copy,
  // CheckCircle,
  AlertCircle,
  PlayCircle,
  Menu,
  X
} from 'lucide-react';
import { youtubeAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const YouTubeSummarizerPage = ({ selectedSessionId, onSessionSelect, isSidebarOpen = true, onToggleSidebar }) => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  
  const [videoUrl, setVideoUrl] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Fetch all sessions
  const { } = useQuery(
    'youtube-sessions',
    youtubeAPI.getSessions,
    {
      select: (response) => response.data,
      onError: (error) => {
        console.error('Error fetching sessions:', error);
        toast.error('Failed to load YouTube sessions');
      }
    }
  );

  // Fetch selected session details
  const { isLoading: sessionLoading } = useQuery(
    ['youtube-session', selectedSessionId],
    () => youtubeAPI.getSession(selectedSessionId),
    {
      select: (response) => response.data,
      enabled: !!selectedSessionId,
      onSuccess: (data) => {
        setSelectedSession(data);
      },
      onError: (error) => {
        console.error('Error fetching session:', error);
        toast.error('Failed to load session details');
      }
    }
  );

  // Create new session mutation
  const createSessionMutation = useMutation(
    youtubeAPI.createSession,
    {
      onSuccess: (response) => {
        const newSession = response.data;
        queryClient.invalidateQueries('youtube-sessions');
        onSessionSelect(newSession.id);
        setVideoUrl('');
        setIsProcessing(false);
        toast.success('Video processed successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to process video');
        setIsProcessing(false);
      }
    }
  );

  // Chat mutation
  const chatMutation = useMutation(
    ({ sessionId, question }) => youtubeAPI.chatWithTranscript(sessionId, question),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['youtube-session', selectedSessionId]);
        setCurrentQuestion('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to get answer');
      }
    }
  );

  // Delete session mutation
  const deleteSessionMutation = useMutation(
    youtubeAPI.deleteSession,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('youtube-sessions');
        if (selectedSessionId) {
          onSessionSelect(null);
        }
        toast.success('Session deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to delete session');
      }
    }
  );

  // Regenerate summaries mutation
  const regenerateMutation = useMutation(
    youtubeAPI.regenerateSummaries,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['youtube-session', selectedSessionId]);
        toast.success('Summaries regenerated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to regenerate summaries');
      }
    }
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession?.chat_history]);

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(videoUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    setIsProcessing(true);
    createSessionMutation.mutate(videoUrl);
  };

  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || !selectedSessionId) return;

    chatMutation.mutate({
      sessionId: selectedSessionId,
      question: currentQuestion.trim()
    });
  };

  const handleExport = async (format) => {
    try {
      const response = await youtubeAPI.exportSession(selectedSessionId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'docx' ? 'docx' : format === 'pdf' ? 'pdf' : 'md';
      const filename = `${selectedSession?.video_title || 'YouTube_Summary'}.${extension}`;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported as ${format.toUpperCase()}`);
      setShowExportMenu(false);
    } catch (error) {
      toast.error('Failed to export summary');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (!selectedSessionId) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Youtube className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">YouTube Summarizer</h1>
                <p className="text-sm text-gray-600">
                  Turn any YouTube video into structured summaries and interactive Q&A
                </p>
              </div>
            </div>
            
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group"
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <PlayCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Get Started with YouTube Summarizer
              </h2>
              <p className="text-gray-600 mb-6">
                Paste a YouTube video URL to generate comprehensive summaries and chat with the content
              </p>
            </div>

            <form onSubmit={handleVideoSubmit} className="space-y-4">
              <div>
                <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isProcessing}
                />
              </div>
              
              <button
                type="submit"
                disabled={isProcessing || !videoUrl.trim()}
                className="w-full btn-primary btn-lg flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing Video...
                  </>
                ) : (
                  <>
                    <Youtube className="h-5 w-5 mr-2" />
                    Summarize Video
                  </>
                )}
              </button>
            </form>

            {isProcessing && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Processing your video...</p>
                    <p className="text-xs text-blue-700">This may take a few minutes depending on video length</p>
                    <div className="mt-2 text-xs text-blue-600">
                      <div>Step 1: Downloading audio...</div>
                      <div>Step 2: Transcribing content...</div>
                      <div>Step 3: Generating summaries...</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!selectedSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Session not found</h3>
          <p className="text-gray-500">The selected session could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <Youtube className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {selectedSession.video_title}
              </h1>
              <p className="text-sm text-gray-500">
                Duration: {formatDuration(selectedSession.video_duration)} • 
                Created: {new Date(selectedSession.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Sidebar Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group"
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
            )}
          </button>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Download className="h-5 w-5" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export as DOCX
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export as Markdown
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => regenerateMutation.mutate(selectedSessionId)}
              disabled={regenerateMutation.isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className={`h-5 w-5 ${regenerateMutation.isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this session?')) {
                  deleteSessionMutation.mutate(selectedSessionId);
                }
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Summaries Sidebar - Always show when session is selected */}
        {selectedSessionId && (
          <div className={`${isSidebarOpen ? 'w-80' : 'w-1/3 min-w-96'} border-r border-gray-200 flex flex-col transition-all duration-300`}>
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Summaries</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Short Summary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Quick Summary</h3>
                  <button
                    onClick={() => copyToClipboard(selectedSession.short_summary)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none text-sm text-gray-700">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                  >
                    {selectedSession.short_summary}
                  </ReactMarkdown>
                </div>
              </div>
              
              {/* Detailed Summary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Detailed Summary</h3>
                  <button
                    onClick={() => copyToClipboard(selectedSession.detailed_summary)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none text-sm text-gray-700">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                  >
                    {selectedSession.detailed_summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedSession.chat_history?.length > 0 ? (
              selectedSession.chat_history.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.timestamp && (
                      <div className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Send className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start asking questions
                  </h3>
                  <p className="text-gray-500 max-w-sm">
                    Ask any question about the video content and get detailed answers based on the transcript.
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleQuestionSubmit} className="flex space-x-3">
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="Ask a question about the video..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={chatMutation.isLoading}
              />
              <button
                type="submit"
                disabled={!currentQuestion.trim() || chatMutation.isLoading}
                className="btn-primary btn-md flex items-center"
              >
                {chatMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeSummarizerPage;
