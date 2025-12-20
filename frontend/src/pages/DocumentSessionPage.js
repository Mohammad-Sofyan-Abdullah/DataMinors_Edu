import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    MessageSquare,
    BookOpen,
    Layers,
    HelpCircle,
    ArrowLeft,
    ArrowRight,
    Send,
    RefreshCw,
    Download,
    Share2,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    Loader2,
    Sparkles,
    GraduationCap,
    Presentation,
    Copy,
    Check,
    Brain,
    Plus,
    Trash2,
    FileImage
} from 'lucide-react';
import { notesAPI } from '../utils/api';
import api from '../utils/api'; // Import default api for baseURL
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ShareToFriendModal from '../components/ShareToFriendModal';
import ConfirmModal from '../components/ConfirmModal';

const DocumentSessionPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State
    const [activeTab, setActiveTab] = useState('chat');
    const [chatMessage, setChatMessage] = useState('');
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
    const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [showQuizResults, setShowQuizResults] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareContentType, setShareContentType] = useState(null);
    const [copiedContent, setCopiedContent] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Helper to get full URL for static files
    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseURL = api.defaults.baseURL || 'http://localhost:8000';
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseURL}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
    };

    const chatContainerRef = useRef(null);

    // Fetch session data
    const { data: session, isLoading, error, refetch } = useQuery(
        ['documentSession', sessionId],
        () => notesAPI.getSession(sessionId).then(res => res.data),
        {
            enabled: !!sessionId,
            onError: () => toast.error('Failed to load session')
        }
    );

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [session?.chat_history]);

    // Summarize mutation
    const summarizeMutation = useMutation(
        () => notesAPI.summarizeSession(sessionId),
        {
            onSuccess: () => {
                toast.success('Summaries generated successfully');
                queryClient.invalidateQueries(['documentSession', sessionId]);
            },
            onError: () => toast.error('Failed to generate summaries')
        }
    );

    // Chat mutation
    const chatMutation = useMutation(
        (message) => notesAPI.chatWithSession(sessionId, message),
        {
            onSuccess: () => {
                setChatMessage('');
                queryClient.invalidateQueries(['documentSession', sessionId]);
            },
            onError: () => toast.error('Failed to send message')
        }
    );

    const clearChatMutation = useMutation(
        () => notesAPI.clearSessionChat(sessionId),
        {
            onSuccess: () => {
                toast.success('Chat memory cleared');
                queryClient.invalidateQueries(['documentSession', sessionId]);
            },
            onError: () => toast.error('Failed to clear chat')
        }
    );

    const QUICK_ACTIONS = [
        "Summarize the key points",
        "Create a short quiz",
        "Explain the main argument",
        "What are the conclusions?"
    ];

    // Flashcards mutation
    const flashcardsMutation = useMutation(
        () => notesAPI.generateFlashcards(sessionId, 15),
        {
            onSuccess: () => {
                toast.success('Flashcards generated successfully');
                queryClient.invalidateQueries(['documentSession', sessionId]);
            },
            onError: () => toast.error('Failed to generate flashcards')
        }
    );

    // Quiz mutation
    const quizMutation = useMutation(
        () => notesAPI.generateQuiz(sessionId, 10),
        {
            onSuccess: () => {
                toast.success('Quiz generated successfully');
                queryClient.invalidateQueries(['documentSession', sessionId]);
                setSelectedAnswers({});
                setCurrentQuizIndex(0);
                setShowQuizResults(false);
            },
            onError: () => toast.error('Failed to generate quiz')
        }
    );

    // Slides mutation
    const slidesMutation = useMutation(
        () => notesAPI.generateSlides(sessionId, 5),
        {
            onSuccess: () => {
                toast.success('Slide generation started');
                // Poll for completion
                const pollInterval = setInterval(async () => {
                    const result = await refetch();
                    if (result.data?.slides_status === 'completed' || result.data?.slides_status === 'failed') {
                        clearInterval(pollInterval);
                        if (result.data?.slides_status === 'completed') {
                            toast.success('Slides generated successfully!');
                        } else {
                            toast.error('Slide generation failed');
                        }
                    }
                }, 3000);
            },
            onError: () => toast.error('Failed to start slide generation')
        }
    );

    // Delete Session Mutation
    const deleteSessionMutation = useMutation(
        () => notesAPI.deleteSession(sessionId),
        {
            onSuccess: () => {
                toast.success('Session deleted successfully');
                navigate('/notes');
            },
            onError: () => toast.error('Failed to delete session')
        }
    );

    // Handlers
    const handleSendChat = (e) => {
        e.preventDefault();
        if (!chatMessage.trim()) return;
        chatMutation.mutate(chatMessage.trim());
    };

    const handleFlashcardNavigation = (direction) => {
        setIsFlashcardFlipped(false);
        if (direction === 'next') {
            setCurrentFlashcardIndex((prev) =>
                prev < (session?.flashcards?.length || 1) - 1 ? prev + 1 : 0
            );
        } else {
            setCurrentFlashcardIndex((prev) =>
                prev > 0 ? prev - 1 : (session?.flashcards?.length || 1) - 1
            );
        }
    };

    const handleQuizAnswer = (questionIndex, answerIndex) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionIndex]: answerIndex
        }));
    };

    const calculateQuizScore = () => {
        if (!session?.quiz?.questions) return 0;
        let correct = 0;
        session.quiz.questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correct_answer) correct++;
        });
        return correct;
    };

    const handleShare = (contentType) => {
        setShareContentType(contentType);
        setShowShareModal(true);
    };

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        setCopiedContent(type);
        setTimeout(() => setCopiedContent(null), 2000);
        toast.success('Copied to clipboard');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Session not found</h2>
                <button
                    onClick={() => navigate('/notes')}
                    className="mt-4 btn-primary"
                >
                    Back to Notes
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'summary', label: 'Summary', icon: BookOpen },
        { id: 'flashcards', label: 'Flashcards', icon: Layers },
        { id: 'quiz', label: 'Quiz', icon: HelpCircle },
        { id: 'slides', label: 'Slides', icon: Presentation },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 flex-none z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                            <button
                                onClick={() => navigate('/notes')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-none"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl font-bold text-gray-900 truncate" title={session.document_title}>
                                    {session.document_title}
                                </h1>
                                <p className="text-sm text-gray-500 truncate">
                                    Document Session
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-none">
                            <button
                                onClick={() => handleShare('document_session')}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors space-x-2"
                            >
                                <Share2 className="h-4 w-4" />
                                <span>Share</span>
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Session"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="mt-4 flex space-x-1 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
                    <AnimatePresence mode="wait">
                        {/* Chat Tab */}
                        {activeTab === 'chat' && (
                            <motion.div
                                key="chat"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full"
                            >
                                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between">
                                    <div>
                                        <h2 className="font-semibold text-gray-900 flex items-center space-x-2">
                                            <Brain className="h-5 w-5 text-blue-600" />
                                            <span>Chat with Document</span>
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Ask questions about the document content
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Start a new chat? This will clear current memory.')) {
                                                clearChatMutation.mutate();
                                            }
                                        }}
                                        className="p-2 hover:bg-white/60 rounded-lg text-gray-600 hover:text-blue-600 transition-colors"
                                        title="Start New Chat (Clear Memory)"
                                    >
                                        <RefreshCw className={`h-5 w-5 ${clearChatMutation.isLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {/* Chat Messages */}
                                <div
                                    ref={chatContainerRef}
                                    className="flex-1 overflow-y-auto p-4 space-y-4"
                                >
                                    {(!session.chat_history || session.chat_history.length === 0) ? (
                                        <div className="text-center py-12">
                                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500">Start a conversation about the document</p>
                                            <p className="text-sm text-gray-400 mt-2">
                                                Try asking: "What is this document about?" or "Summarize the key points"
                                            </p>
                                        </div>
                                    ) : (
                                        session.chat_history.map((msg, index) => (
                                            <div
                                                key={index}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-900'
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {chatMutation.isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-gray-100 p-3 rounded-lg">
                                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="px-4 pb-2 pt-2 flex space-x-2 overflow-x-auto border-t border-gray-100 bg-gray-50/50">
                                    {QUICK_ACTIONS.map((action, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => chatMutation.mutate(action)}
                                            className="px-4 py-2 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-full text-sm font-medium text-gray-700 hover:text-blue-700 whitespace-nowrap transition-all shadow-sm hover:shadow-md"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>

                                {/* Chat Input */}
                                <form onSubmit={handleSendChat} className="p-4 border-t border-gray-200 bg-white">
                                    <div className="flex space-x-3">
                                        <input
                                            type="text"
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                            placeholder="Ask a question about the document..."
                                            className="flex-1 input"
                                            disabled={chatMutation.isLoading}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!chatMessage.trim() || chatMutation.isLoading}
                                            className="btn-primary flex items-center space-x-2"
                                        >
                                            <Send className="h-4 w-4" />
                                            <span>Send</span>
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* Summary Tab */}
                        {activeTab === 'summary' && (
                            <motion.div
                                key="summary"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6 h-full overflow-y-auto pr-2"
                            >
                                {(!session.short_summary && !session.detailed_summary) ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                                        <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                            No Summary Generated Yet
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            Generate AI-powered summaries of your document
                                        </p>
                                        <button
                                            onClick={() => summarizeMutation.mutate()}
                                            disabled={summarizeMutation.isLoading}
                                            className="btn-primary flex items-center space-x-2 mx-auto"
                                        >
                                            {summarizeMutation.isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-4 w-4" />
                                            )}
                                            <span>{summarizeMutation.isLoading ? 'Generating...' : 'Generate Summary'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Short Summary */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Quick Overview</h3>
                                                    <p className="text-sm text-gray-600">A brief summary of the key points</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(session.short_summary, 'short')}
                                                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                                >
                                                    {copiedContent === 'short' ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4 text-gray-600" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-gray-700 whitespace-pre-wrap">{session.short_summary}</p>
                                            </div>
                                        </div>

                                        {/* Detailed Summary */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Detailed Summary</h3>
                                                    <p className="text-sm text-gray-600">Comprehensive breakdown of the document</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleCopy(session.detailed_summary, 'detailed')}
                                                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                                    >
                                                        {copiedContent === 'detailed' ? (
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="h-4 w-4 text-gray-600" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => summarizeMutation.mutate()}
                                                        disabled={summarizeMutation.isLoading}
                                                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                                        title="Regenerate"
                                                    >
                                                        <RefreshCw className={`h-4 w-4 text-gray-600 ${summarizeMutation.isLoading ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-gray-700 whitespace-pre-wrap">{session.detailed_summary}</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* Flashcards Tab */}
                        {activeTab === 'flashcards' && (
                            <motion.div
                                key="flashcards"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="h-full flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-200"
                            >
                                {/* Header / Controls */}
                                <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <GraduationCap className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Flashcards</h3>
                                            <p className="text-sm text-gray-500">
                                                {session.flashcards?.length || 0} cards available
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => flashcardsMutation.mutate()}
                                        disabled={flashcardsMutation.isLoading}
                                        className="btn-outline flex items-center space-x-2 text-sm"
                                    >
                                        {flashcardsMutation.isLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        <span>Regenerate</span>
                                    </button>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center justify-center bg-gray-50/50">
                                    {(!session?.flashcards || session.flashcards.length === 0) ? (
                                        <div className="text-center max-w-md mx-auto">
                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6">
                                                <Layers className="h-8 w-8 text-indigo-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">No flashcards yet</h3>
                                            <p className="text-gray-500 mb-8 leading-relaxed">
                                                Generate flashcards from your document to start testing your knowledge and memorizing key concepts.
                                            </p>
                                            <button
                                                onClick={() => flashcardsMutation.mutate()}
                                                disabled={flashcardsMutation.isLoading}
                                                className="btn-primary w-full justify-center py-3 text-base shadow-lg shadow-primary-500/20"
                                            >
                                                {flashcardsMutation.isLoading ? (
                                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                ) : (
                                                    <Sparkles className="h-5 w-5 mr-2" />
                                                )}
                                                Generate Flashcards
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-3xl flex flex-col gap-8">
                                            {/* Progress Bar */}
                                            <div className="w-full flex items-center gap-4">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <motion.div
                                                        className="bg-indigo-600 h-2 rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${((currentFlashcardIndex + 1) / session.flashcards.length) * 100}%` }}
                                                        transition={{ duration: 0.3 }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                    {Math.round(((currentFlashcardIndex + 1) / session.flashcards.length) * 100)}% Complete
                                                </span>
                                            </div>

                                            {/* Card Container */}
                                            <div
                                                className="relative w-full aspect-[16/9] cursor-pointer perspective-1000 group"
                                                onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                                            >
                                                {/* Card Front */}
                                                <motion.div
                                                    className="absolute inset-0 w-full h-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 md:p-16 flex flex-col items-center justify-center text-center backface-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300"
                                                    animate={{ rotateY: isFlashcardFlipped ? 180 : 0 }}
                                                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                                                    style={{ backfaceVisibility: 'hidden' }}
                                                >
                                                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-6 px-3 py-1 bg-indigo-50 rounded-full">Question</span>
                                                    <p className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed font-serif">
                                                        {session.flashcards[currentFlashcardIndex]?.question}
                                                    </p>
                                                    <p className="text-gray-400 text-sm mt-auto pt-8 group-hover:text-indigo-500 transition-colors flex items-center gap-2">
                                                        <span>Click to flip</span>
                                                        <ArrowRight className="h-3 w-3" />
                                                    </p>
                                                </motion.div>

                                                {/* Card Back */}
                                                <motion.div
                                                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-[0_8px_30px_rgb(79,70,229,0.3)] p-8 md:p-16 flex flex-col items-center justify-center text-center text-white backface-hidden"
                                                    initial={{ rotateY: 180 }}
                                                    animate={{ rotateY: isFlashcardFlipped ? 0 : 180 }}
                                                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                                                    style={{ backfaceVisibility: 'hidden' }}
                                                >
                                                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-6 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">Answer</span>
                                                    <p className="text-xl md:text-2xl font-medium leading-relaxed">
                                                        {session.flashcards[currentFlashcardIndex]?.answer}
                                                    </p>
                                                    {session.flashcards[currentFlashcardIndex]?.explanation && (
                                                        <div className="mt-8 pt-6 border-t border-white/10 w-full">
                                                            <p className="text-indigo-100 text-sm leading-relaxed">
                                                                <span className="font-semibold text-white mr-2">Explanation:</span>
                                                                {session.flashcards[currentFlashcardIndex]?.explanation}
                                                            </p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex items-center justify-between px-4 mt-auto">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFlashcardNavigation('prev');
                                                    }}
                                                    className={`p-4 rounded-full transition-all duration-200 flex items-center gap-2 ${currentFlashcardIndex === 0
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-gray-700 hover:bg-white hover:shadow-md hover:text-indigo-600 bg-white/50 border border-transparent hover:border-gray-100'
                                                        }`}
                                                    disabled={currentFlashcardIndex === 0}
                                                >
                                                    <ChevronLeft className="h-6 w-6" />
                                                    <span className="text-sm font-medium hidden md:block">Previous</span>
                                                </button>

                                                <div className="text-gray-900 font-bold font-mono text-lg tracking-wider bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                                                    {currentFlashcardIndex + 1} <span className="text-gray-300 font-light">/</span> {session.flashcards.length}
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFlashcardNavigation('next');
                                                    }}
                                                    className={`p-4 rounded-full transition-all duration-200 flex items-center gap-2 ${currentFlashcardIndex === session.flashcards.length - 1
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-gray-700 hover:bg-white hover:shadow-md hover:text-indigo-600 bg-white/50 border border-transparent hover:border-gray-100'
                                                        }`}
                                                    disabled={currentFlashcardIndex === session.flashcards.length - 1}
                                                >
                                                    <span className="text-sm font-medium hidden md:block">Next</span>
                                                    <ChevronRight className="h-6 w-6" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Quiz Tab */}
                        {activeTab === 'quiz' && (
                            <motion.div
                                key="quiz"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full overflow-y-auto"
                            >
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                                            <HelpCircle className="h-5 w-5 text-blue-600" />
                                            <span>Quiz</span>
                                        </h3>
                                        <p className="text-sm text-gray-600">Test your knowledge of the document</p>
                                    </div>
                                    <button
                                        onClick={() => quizMutation.mutate()}
                                        disabled={quizMutation.isLoading}
                                        className="btn-outline flex items-center space-x-2"
                                    >
                                        {quizMutation.isLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        <span>{session?.quiz?.questions?.length ? 'New Quiz' : 'Generate'}</span>
                                    </button>
                                </div>

                                {(!session?.quiz?.questions || session.quiz.questions.length === 0) ? (
                                    <div className="p-12 text-center">
                                        <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Quiz Yet</h3>
                                        <p className="text-gray-500 mb-4">
                                            {session.detailed_summary
                                                ? 'Generate a quiz to test your understanding'
                                                : 'Generate a summary first, then create a quiz'}
                                        </p>
                                        {session.detailed_summary && (
                                            <button
                                                onClick={() => quizMutation.mutate()}
                                                disabled={quizMutation.isLoading}
                                                className="btn-primary flex items-center space-x-2 mx-auto"
                                            >
                                                <Sparkles className="h-4 w-4" />
                                                <span>Generate Quiz</span>
                                            </button>
                                        )}
                                    </div>
                                ) : !showQuizResults ? (
                                    <div className="p-6">
                                        {/* Current Question */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-sm text-gray-500">
                                                    Question {currentQuizIndex + 1} of {session.quiz.questions.length}
                                                </span>
                                                <div className="h-2 flex-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 transition-all"
                                                        style={{ width: `${((currentQuizIndex + 1) / session.quiz.questions.length) * 100}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <h4 className="text-lg font-medium text-gray-900 mb-4">
                                                {session.quiz.questions[currentQuizIndex].question}
                                            </h4>

                                            <div className="space-y-3">
                                                {session.quiz.questions[currentQuizIndex].options.map((option, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleQuizAnswer(currentQuizIndex, idx)}
                                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedAnswers[currentQuizIndex] === idx
                                                            ? 'border-blue-600 bg-blue-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <span className="font-medium mr-2">
                                                            {String.fromCharCode(65 + idx)}.
                                                        </span>
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Navigation */}
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => setCurrentQuizIndex(prev => Math.max(0, prev - 1))}
                                                disabled={currentQuizIndex === 0}
                                                className="btn-outline"
                                            >
                                                Previous
                                            </button>
                                            {currentQuizIndex === session.quiz.questions.length - 1 ? (
                                                <button
                                                    onClick={() => setShowQuizResults(true)}
                                                    className="btn-primary"
                                                >
                                                    Finish Quiz
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentQuizIndex(prev => prev + 1)}
                                                    className="btn-primary"
                                                >
                                                    Next
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Quiz Results */
                                    <div className="p-6">
                                        <div className="text-center mb-6">
                                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${calculateQuizScore() >= session.quiz.questions.length * 0.7
                                                ? 'bg-green-100'
                                                : calculateQuizScore() >= session.quiz.questions.length * 0.5
                                                    ? 'bg-yellow-100'
                                                    : 'bg-red-100'
                                                }`}>
                                                <span className={`text-2xl font-bold ${calculateQuizScore() >= session.quiz.questions.length * 0.7
                                                    ? 'text-green-600'
                                                    : calculateQuizScore() >= session.quiz.questions.length * 0.5
                                                        ? 'text-yellow-600'
                                                        : 'text-red-600'
                                                    }`}>
                                                    {calculateQuizScore()}/{session.quiz.questions.length}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-900">Quiz Complete!</h3>
                                            <p className="text-gray-500">
                                                You scored {Math.round((calculateQuizScore() / session.quiz.questions.length) * 100)}%
                                            </p>
                                        </div>

                                        {/* Review Answers */}
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {session.quiz.questions.map((q, idx) => (
                                                <div key={idx} className="p-4 rounded-lg border border-gray-200">
                                                    <div className="flex items-start space-x-3">
                                                        {selectedAnswers[idx] === q.correct_answer ? (
                                                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">{q.question}</p>
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                Your answer: {q.options[selectedAnswers[idx]] || 'Not answered'}
                                                            </p>
                                                            {selectedAnswers[idx] !== q.correct_answer && (
                                                                <p className="text-sm text-green-600 mt-1">
                                                                    Correct: {q.options[q.correct_answer]}
                                                                </p>
                                                            )}
                                                            {q.explanation && (
                                                                <p className="text-sm text-gray-500 mt-2 italic">
                                                                    {q.explanation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 flex justify-center">
                                            <button
                                                onClick={() => {
                                                    setShowQuizResults(false);
                                                    setSelectedAnswers({});
                                                    setCurrentQuizIndex(0);
                                                }}
                                                className="btn-primary"
                                            >
                                                Retake Quiz
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Slides Tab */}
                        {activeTab === 'slides' && (
                            <motion.div
                                key="slides"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full overflow-y-auto"
                            >
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                                            <Presentation className="h-5 w-5 text-purple-600" />
                                            <span>Presentation Slides</span>
                                        </h3>
                                        <p className="text-sm text-gray-600">AI-generated visual slides from the document</p>
                                    </div>
                                    {session.slides_status !== 'processing' && (
                                        <button
                                            onClick={() => slidesMutation.mutate()}
                                            disabled={slidesMutation.isLoading}
                                            className="btn-outline flex items-center space-x-2"
                                        >
                                            {slidesMutation.isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                session.slides_pdf_url ? <RefreshCw className="h-4 w-4" /> : <Plus className="h-4 w-4" />
                                            )}
                                            <span>{session.slides_pdf_url ? 'Regenerate' : 'Generate'}</span>
                                        </button>
                                    )}
                                </div>

                                {session.slides_status === 'processing' ? (
                                    <div className="p-12 text-center">
                                        <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Generating Slides...</h3>
                                        <p className="text-gray-500">This may take a few minutes. Please wait.</p>
                                    </div>
                                ) : !session.slides_pdf_url && !session.generated_slide_images?.length ? (
                                    <div className="p-12 text-center">
                                        <FileImage className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Slides Yet</h3>
                                        <p className="text-gray-500 mb-4">
                                            {session.detailed_summary
                                                ? 'Generate visual presentation slides'
                                                : 'Generate a summary first, then create slides'}
                                        </p>
                                        {session.detailed_summary && (
                                            <button
                                                onClick={() => slidesMutation.mutate()}
                                                disabled={slidesMutation.isLoading}
                                                className="btn-primary flex items-center space-x-2 mx-auto"
                                            >
                                                <Sparkles className="h-4 w-4" />
                                                <span>Generate Slides</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        {/* Slide Images Gallery */}
                                        {session.generated_slide_images?.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                                {session.generated_slide_images.map((imageUrl, idx) => (
                                                    <div key={idx} className="rounded-lg overflow-hidden shadow-md bg-gray-100">
                                                        <img
                                                            src={getFullUrl(imageUrl)}
                                                            alt={`Slide ${idx + 1}`}
                                                            className="w-full h-auto object-contain"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://via.placeholder.com/400x225?text=Slide+Load+Error';
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Download PDF */}
                                        {session.slides_pdf_url && (
                                            <div className="flex justify-center">
                                                <a
                                                    href={getFullUrl(session.slides_pdf_url)}
                                                    download={`presentation-${sessionId}.pdf`}
                                                    className="btn-primary flex items-center space-x-2"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    <span>Download PDF</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Share Modal */}
                {showShareModal && (
                    <ShareToFriendModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        contentType={shareContentType}
                        contentId={sessionId}
                        contentTitle={session.document_title}
                    />
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={() => deleteSessionMutation.mutate()}
                    title="Delete Session"
                    message="Are you sure you want to delete this session? This action cannot be undone."
                    confirmText="Delete"
                    isLoading={deleteSessionMutation.isLoading}
                />
            </div>
        </div>
    );
};

export default DocumentSessionPage;
