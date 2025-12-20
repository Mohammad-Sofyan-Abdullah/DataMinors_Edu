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
  X,
  MessageSquare,
  BookOpen,
  Layers,
  Presentation,
  ExternalLink,
  Clock,
  Star,
  TrendingUp,
  Share2
} from 'lucide-react';
import { youtubeAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Flashcard from '../components/Flashcard';
import ShareToFriendModal from '../components/ShareToFriendModal';
import Button from '../components/Button';

const YouTubeSummarizerPage = ({ selectedSessionId, onSessionSelect, isSidebarOpen = true, onToggleSidebar }) => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  const [videoUrl, setVideoUrl] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'summaries', 'flashcards', 'related-videos'
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isExplainingCard, setIsExplainingCard] = useState(false);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [isGeneratingRelatedVideos, setIsGeneratingRelatedVideos] = useState(false);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareContent, setShareContent] = useState(null);

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
        console.log('Session data loaded:', data);
        setSelectedSession(data);
        // Always update flashcards based on the current session
        if (data.flashcards && data.flashcards.length > 0) {
          setFlashcards(data.flashcards);
        } else {
          // Clear flashcards if the current session doesn't have any
          setFlashcards([]);
        }
        // Update related videos based on the current session
        if (data.related_videos && data.related_videos.length > 0) {
          console.log('Loading related videos from session:', data.related_videos);
          setRelatedVideos(data.related_videos);
        } else {
          // Clear related videos if the current session doesn't have any
          console.log('No related videos in session, clearing state');
          setRelatedVideos([]);
        }
        // Reset to first card when switching sessions
        setCurrentCardIndex(0);
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

  const handleGenerateFlashcards = async () => {
    if (!selectedSessionId) return;

    setIsGeneratingFlashcards(true);
    try {
      // Request 15 as a guide, but AI will determine optimal count based on content
      const response = await youtubeAPI.generateFlashcards(selectedSessionId, 15);
      setFlashcards(response.data.flashcards);
      setCurrentCardIndex(0);
      const count = response.data.count;
      toast.success(`Generated ${count} high-quality flashcard${count !== 1 ? 's' : ''}!`);
      queryClient.invalidateQueries(['youtube-session', selectedSessionId]);
    } catch (error) {
      toast.error('Failed to generate flashcards');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleExplainFlashcard = async (question, answer) => {
    if (!selectedSessionId) return null;

    setIsExplainingCard(true);
    try {
      const response = await youtubeAPI.explainFlashcard(selectedSessionId, question, answer);
      return response.data.explanation;
    } catch (error) {
      toast.error('Failed to get explanation');
      return null;
    } finally {
      setIsExplainingCard(false);
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  // Extract video ID from YouTube URL for thumbnail
  const extractVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  // Share handlers
  const handleShareSummary = () => {
    const videoId = extractVideoId(selectedSession?.video_url);
    setShareContent({
      contentType: 'youtube_summary',
      contentData: {
        title: selectedSession?.video_title || 'YouTube Summary',
        description: selectedSession?.short_summary?.substring(0, 200) + '...',
        preview_text: selectedSession?.detailed_summary?.substring(0, 500),
        preview_image_url: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null,
        source_url: selectedSession?.video_url,
        source_id: selectedSession?.id || selectedSessionId,
      }
    });
    setShareModalOpen(true);
  };

  const handleShareFlashcards = () => {
    const videoId = extractVideoId(selectedSession?.video_url);
    setShareContent({
      contentType: 'flashcards',
      contentData: {
        title: `Flashcards: ${selectedSession?.video_title || 'Video'}`,
        description: `${flashcards?.length || 0} flashcards for studying`,
        preview_image_url: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null,
        source_id: selectedSession?.id || selectedSessionId,
        metadata: {
          flashcards: flashcards?.slice(0, 5),  // Include first 5 flashcards as preview
          total_count: flashcards?.length || 0
        }
      }
    });
    setShareModalOpen(true);
  };

  const handleShareSlides = () => {
    const videoId = extractVideoId(selectedSession?.video_url);
    setShareContent({
      contentType: 'slides',
      contentData: {
        title: `Slides: ${selectedSession?.video_title || 'Video'}`,
        description: `Presentation slides generated from video`,
        preview_image_url: selectedSession?.generated_slide_images?.[0] ||
          (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null),
        source_id: selectedSession?.id || selectedSessionId,
        metadata: {
          slide_images: selectedSession?.generated_slide_images?.slice(0, 3),  // First 3 slides as preview
          total_slides: selectedSession?.generated_slide_images?.length || 0
        }
      }
    });
    setShareModalOpen(true);
  };

  // Share the full session (can be imported by friend)
  const handleShareSession = () => {
    const videoId = extractVideoId(selectedSession?.video_url);
    const chatCount = selectedSession?.chat_history?.length || 0;
    const flashcardsCount = flashcards?.length || 0;

    setShareContent({
      contentType: 'youtube_session',
      contentData: {
        title: selectedSession?.video_title || 'YouTube Session',
        description: `Complete session with ${chatCount > 0 ? `${chatCount} chat messages` : 'summary'}${flashcardsCount > 0 ? `, ${flashcardsCount} flashcards` : ''}`,
        preview_text: selectedSession?.short_summary?.substring(0, 300),
        preview_image_url: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null,
        source_url: selectedSession?.video_url,
        source_id: selectedSession?.id || selectedSessionId,
        metadata: {
          has_chat: chatCount > 0,
          chat_count: chatCount,
          has_flashcards: flashcardsCount > 0,
          flashcards_count: flashcardsCount,
          has_slides: !!selectedSession?.slides_pdf_url,
          video_duration: selectedSession?.video_duration
        }
      }
    });
    setShareModalOpen(true);
  };

  // Poll for slides status
  useEffect(() => {
    let pollInterval;

    if (selectedSession?.slides_status === 'processing') {
      setIsGeneratingSlides(true);
      pollInterval = setInterval(async () => {
        // Invalidate query to refetch session
        queryClient.invalidateQueries(['youtube-session', selectedSessionId]);
      }, 5000);
    } else {
      setIsGeneratingSlides(false);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedSession?.slides_status, selectedSessionId, queryClient]);

  const handleGenerateSlides = async () => {
    if (!selectedSessionId) return;

    setIsGeneratingSlides(true);
    try {
      // Changed to use longRunningApi in backend, but here call remains same, 
      // backend now returns immediately with status "processing".
      const response = await youtubeAPI.generateSlides(selectedSessionId, 5);
      toast.success('Slide generation started!');
      // State 'isGeneratingSlides' continues via polling logic
      queryClient.invalidateQueries(['youtube-session', selectedSessionId]);
    } catch (error) {
      toast.error('Failed to start slide generation');
      setIsGeneratingSlides(false);
    }
  };

  const handleGenerateRelatedVideos = async () => {
    if (!selectedSessionId) return;

    setIsGeneratingRelatedVideos(true);
    try {
      console.log('Starting related videos generation...');
      const response = await youtubeAPI.generateRelatedVideos(selectedSessionId, 8);
      console.log('Full API response:', response);
      console.log('Response data:', response.data);
      console.log('Related videos from API:', response.data.related_videos);

      // Immediately update the state with the generated videos
      const generatedVideos = response.data.related_videos || [];
      console.log('Setting relatedVideos state to:', generatedVideos);
      setRelatedVideos(generatedVideos);

      // Force a state update by setting a temporary value first
      setRelatedVideos([]);
      setTimeout(() => {
        setRelatedVideos(generatedVideos);
      }, 100);

      const count = response.data.count;
      toast.success(`Generated ${count} related video suggestion${count !== 1 ? 's' : ''}!`);

      // Also invalidate the query to update the session data
      queryClient.invalidateQueries(['youtube-session', selectedSessionId]);

    } catch (error) {
      toast.error('Failed to generate related videos');
      console.error('Error generating related videos:', error);
    } finally {
      setIsGeneratingRelatedVideos(false);
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
            <div className="bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                className="p-2 h-auto"
              >
                {isSidebarOpen ? (
                  <X className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                )}
              </Button>
            </div>
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

              <Button
                type="submit"
                size="lg"
                className="w-full flex items-center justify-center"
                disabled={isProcessing || !videoUrl.trim()}
                isLoading={isProcessing}
                leftIcon={!isProcessing && <Youtube className="h-5 w-5" />}
              >
                {isProcessing ? 'Processing Video...' : 'Summarize Video'}
              </Button>
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
          {/* Sidebar Toggle Button */}
          <div className="bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              className="p-2 h-auto"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Share Session Button */}
            {/* Share Session Button */}
            <Button
              onClick={handleShareSession}
              className="bg-green-500 hover:bg-green-600 text-white border-transparent"
              size="sm"
              title="Share session with friends"
              leftIcon={<Share2 className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Share Session</span>
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 h-auto text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Download className="h-5 w-5" />
              </Button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <Button
                    onClick={() => handleExport('pdf')}
                    variant="ghost"
                    className="w-full justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 h-auto rounded-none"
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    Export as PDF
                  </Button>
                  <Button
                    onClick={() => handleExport('docx')}
                    variant="ghost"
                    className="w-full justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 h-auto rounded-none"
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    Export as DOCX
                  </Button>
                  <Button
                    onClick={() => handleExport('markdown')}
                    variant="ghost"
                    className="w-full justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 h-auto rounded-none"
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    Export as Markdown
                  </Button>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={() => regenerateMutation.mutate(selectedSessionId)}
              disabled={regenerateMutation.isLoading}
              isLoading={regenerateMutation.isLoading}
              className="p-2 h-auto text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {!regenerateMutation.isLoading && <RefreshCw className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this session?')) {
                  deleteSessionMutation.mutate(selectedSessionId);
                }
              }}
              className="p-2 h-auto text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'chat'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <MessageSquare size={18} />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('summaries')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'summaries'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Layers size={18} />
              Summaries
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'flashcards'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <BookOpen size={18} />
              Flashcards
              {flashcards.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {flashcards.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('slides')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'slides'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Presentation size={18} />
              Slides
            </button>
            <button
              onClick={() => setActiveTab('related-videos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'related-videos'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <TrendingUp size={18} />
              Related Videos
              {relatedVideos.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {relatedVideos.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex">
              {/* Summaries Sidebar - Show in chat tab when sidebar is closed */}
              {!isSidebarOpen && (
                <div className="w-1/3 min-w-96 border-r border-gray-200 flex flex-col">
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                          className={`max-w-3xl rounded-lg px-4 py-3 ${message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          <div className="text-sm prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          {message.timestamp && (
                            <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
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
          )}

          {/* Summaries Tab */}
          {activeTab === 'summaries' && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Short Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Quick Summary</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleShareSummary}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Share to friends"
                      >
                        <Share2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Share</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedSession.short_summary)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-base max-w-none text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedSession.short_summary}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Detailed Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Detailed Summary</h2>
                    <button
                      onClick={() => copyToClipboard(selectedSession.detailed_summary)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="prose prose-base max-w-none text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedSession.detailed_summary}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Flashcards Tab */}
          {activeTab === 'flashcards' && (
            <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="max-w-4xl mx-auto">
                {flashcards.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-6">
                      <BookOpen className="h-10 w-10 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                      Generate Flashcards
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      AI will create high-quality flashcards based on the concepts explained in this video. The number of cards will be optimized for learning quality.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGenerateFlashcards}
                      disabled={isGeneratingFlashcards}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
                    >
                      {isGeneratingFlashcards ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating Flashcards...
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-5 w-5" />
                          Generate Flashcards
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Study Flashcards
                      </h2>
                      <p className="text-gray-600 mb-4">
                        Review the key concepts from this video
                      </p>
                      <button
                        onClick={handleShareFlashcards}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Share2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Share Flashcards</span>
                      </button>
                    </div>

                    <Flashcard
                      flashcard={flashcards[currentCardIndex]}
                      cardNumber={currentCardIndex + 1}
                      totalCards={flashcards.length}
                      onNext={handleNextCard}
                      onPrevious={handlePreviousCard}
                      onExplain={handleExplainFlashcard}
                      isExplaining={isExplainingCard}
                    />

                    <div className="text-center mt-8">
                      <button
                        onClick={handleGenerateFlashcards}
                        disabled={isGeneratingFlashcards}
                        className="text-sm text-gray-600 hover:text-gray-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingFlashcards ? 'Regenerating...' : 'Regenerate Flashcards'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Slides Tab */}
          {activeTab === 'slides' && (
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              <div className="max-w-4xl mx-auto text-center">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <Presentation className="h-10 w-10 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Visual Slides
                  </h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Generate visual slides with diagrams to present this content. The AI will create a structured presentation with generated images.
                  </p>

                  {selectedSession.slides_status === 'completed' || selectedSession.slides_pdf_url ? (
                    <div className="space-y-8">
                      {/* Images Grid */}
                      {selectedSession.generated_slide_images && selectedSession.generated_slide_images.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          {selectedSession.generated_slide_images.map((imgUrl, index) => (
                            <div key={index} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-md border hover:shadow-lg transition-shadow">
                              <img
                                src={`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${imgUrl}`}
                                alt={`Slide ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                                Slide {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 inline-block mb-4">
                        Slides are ready!
                      </div>
                      <div className="flex gap-4 justify-center">
                        <a
                          href={`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${selectedSession.slides_pdf_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <Download className="h-5 w-5" />
                          Download PDF
                        </a>
                        <button
                          onClick={handleGenerateSlides}
                          disabled={isGeneratingSlides}
                          className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className={`h-5 w-5 ${isGeneratingSlides ? 'animate-spin' : ''}`} />
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateSlides}
                      disabled={isGeneratingSlides || selectedSession.slides_status === 'processing'}
                      className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
                    >
                      {isGeneratingSlides || selectedSession.slides_status === 'processing' ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating Slides...
                        </>
                      ) : (
                        <>
                          <Presentation className="h-5 w-5" />
                          Generate Slides
                        </>
                      )}
                    </button>
                  )}

                  {(isGeneratingSlides || selectedSession.slides_status === 'processing') && (
                    <p className="text-sm text-gray-500 mt-4 animate-pulse">
                      We are generating images for your slides. This process runs in the background. Note: Large videos may take a few minutes.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Related Videos Tab */}
          {activeTab === 'related-videos' && (
            <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="max-w-6xl mx-auto">
                {(relatedVideos.length === 0 && (!selectedSession?.related_videos || selectedSession.related_videos.length === 0)) ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-6">
                      <TrendingUp className="h-10 w-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                      Discover Related Videos
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      Get AI-curated YouTube video suggestions to deepen your understanding and prepare for exams. Perfect for comprehensive learning.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        console.log('Current relatedVideos state:', relatedVideos);
                        handleGenerateRelatedVideos();
                      }}
                      disabled={isGeneratingRelatedVideos}
                      className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
                    >
                      {isGeneratingRelatedVideos ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Finding Related Videos...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-5 w-5" />
                          Find Related Videos
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Related Videos for Further Study
                      </h2>
                      <p className="text-gray-600">
                        AI-curated video suggestions to enhance your learning journey
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(relatedVideos.length > 0 ? relatedVideos : selectedSession?.related_videos || []).map((video, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                  <PlayCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${video.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                                    video.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                    {video.difficulty}
                                  </span>
                                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                    {video.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
                              {video.title}
                            </h3>

                            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                              {video.description}
                            </p>

                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{video.estimated_duration}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3" />
                                <span>Recommended</span>
                              </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg mb-4">
                              <p className="text-xs text-blue-800 font-medium mb-1">Why this helps:</p>
                              <p className="text-xs text-blue-700 line-clamp-2">
                                {video.why_relevant}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                const searchQuery = encodeURIComponent(video.title);
                                window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
                              }}
                              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                              <Youtube className="h-4 w-4" />
                              <span>Search on YouTube</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="text-center mt-8">
                      <button
                        onClick={handleGenerateRelatedVideos}
                        disabled={isGeneratingRelatedVideos}
                        className="text-sm text-gray-600 hover:text-gray-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingRelatedVideos ? 'Generating...' : 'Refresh Suggestions'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Share Modal */}
      <ShareToFriendModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareContent(null);
        }}
        contentType={shareContent?.contentType}
        contentData={shareContent?.contentData}
      />
    </div>
  );
};

export default YouTubeSummarizerPage;
