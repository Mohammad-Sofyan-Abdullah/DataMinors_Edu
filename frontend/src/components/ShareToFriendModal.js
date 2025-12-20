import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Send, Search, User, Check, Youtube, FileText, BookOpen, MessageSquare, Layers } from 'lucide-react';
import { friendsAPI, messagesAPI } from '../utils/api';
import toast from 'react-hot-toast';

/**
 * ShareToFriendModal - A reusable modal for sharing content to friends
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when the modal is closed
 * @param {string} contentType - Type of content: 'youtube_summary' | 'flashcards' | 'slides' | 'notes' | 'ai_chat'
 * @param {object} contentData - Content data to share
 *   - title: string
 *   - description: string (optional)
 *   - preview_text: string (optional)
 *   - preview_image_url: string (optional)
 *   - source_url: string (optional)
 *   - source_id: string (optional)
 *   - metadata: object (optional, for flashcards/slides data)
 */
const ShareToFriendModal = ({
    isOpen,
    onClose,
    contentType,
    contentData,
}) => {
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [customMessage, setCustomMessage] = useState('');

    // Fetch friends list
    const { data: friends = [], isLoading: friendsLoading } = useQuery(
        'friends-for-sharing',
        () => friendsAPI.getFriends().then(res => res.data),
        { enabled: isOpen }
    );

    // Share mutation
    const shareMutation = useMutation(
        ({ friendId, content }) => messagesAPI.shareContent(friendId, content),
        {
            onSuccess: () => {
                toast.success(`Shared to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
                setSelectedFriends([]);
                setCustomMessage('');
                onClose();
            },
            onError: (error) => {
                console.error('Share error:', error);
                toast.error('Failed to share content');
            }
        }
    );

    // Filter friends based on search query
    const filteredFriends = friends.filter(friend => {
        const name = friend.name || friend.full_name || '';
        const email = friend.email || '';
        const query = searchQuery.toLowerCase();
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    });

    // Toggle friend selection
    const toggleFriendSelection = (friendId) => {
        setSelectedFriends(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    };

    // Handle share action
    const handleShare = async () => {
        if (selectedFriends.length === 0) {
            toast.error('Please select at least one friend');
            return;
        }

        // Share to all selected friends
        for (const friendId of selectedFriends) {
            await shareMutation.mutateAsync({
                friendId,
                content: {
                    content_type: contentType,
                    message: customMessage,
                    ...contentData
                }
            });
        }
    };

    // Get content type icon
    const getContentTypeIcon = () => {
        switch (contentType) {
            case 'youtube_summary':
            case 'youtube_video':
                return <Youtube className="w-5 h-5 text-red-500" />;
            case 'flashcards':
                return <BookOpen className="w-5 h-5 text-purple-500" />;
            case 'slides':
                return <Layers className="w-5 h-5 text-blue-500" />;
            case 'notes':
                return <FileText className="w-5 h-5 text-green-500" />;
            case 'ai_chat':
                return <MessageSquare className="w-5 h-5 text-indigo-500" />;
            default:
                return <Share2 className="w-5 h-5 text-gray-500" />;
        }
    };

    // Get content type label
    const getContentTypeLabel = () => {
        switch (contentType) {
            case 'youtube_summary':
                return 'YouTube Summary';
            case 'youtube_video':
                return 'YouTube Video';
            case 'flashcards':
                return 'Flashcards';
            case 'slides':
                return 'Slides';
            case 'notes':
                return 'Notes';
            case 'ai_chat':
                return 'AI Chat';
            default:
                return 'Content';
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900">Share to Friends</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content Preview */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-start gap-3">
                            {contentData?.preview_image_url ? (
                                <img
                                    src={contentData.preview_image_url}
                                    alt={contentData.title}
                                    className="w-20 h-14 object-cover rounded-lg"
                                />
                            ) : (
                                <div className="w-20 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                                    {getContentTypeIcon()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {getContentTypeIcon()}
                                    <span className="text-xs font-medium text-gray-500">{getContentTypeLabel()}</span>
                                </div>
                                <h3 className="font-medium text-gray-900 text-sm truncate">{contentData?.title}</h3>
                                {contentData?.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{contentData.description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search friends..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    {/* Friends List */}
                    <div className="max-h-64 overflow-y-auto px-4">
                        {friendsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            </div>
                        ) : filteredFriends.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {searchQuery ? 'No friends found' : 'No friends yet'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredFriends.map((friend) => {
                                    const friendId = friend.id || friend._id;
                                    const friendName = friend.name || friend.full_name || 'Friend';
                                    const isSelected = selectedFriends.includes(friendId);

                                    return (
                                        <button
                                            key={friendId}
                                            onClick={() => toggleFriendSelection(friendId)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${isSelected
                                                    ? 'bg-blue-50 border-2 border-blue-500'
                                                    : 'hover:bg-gray-50 border-2 border-transparent'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${isSelected
                                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                                }`}>
                                                {friendName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h4 className="font-medium text-gray-900">{friendName}</h4>
                                                {friend.email && (
                                                    <p className="text-xs text-gray-500">{friend.email}</p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Custom Message */}
                    <div className="p-4 border-t border-gray-200">
                        <input
                            type="text"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Add a message (optional)..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
                            </span>
                            <button
                                onClick={handleShare}
                                disabled={selectedFriends.length === 0 || shareMutation.isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {shareMutation.isLoading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Share
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ShareToFriendModal;
