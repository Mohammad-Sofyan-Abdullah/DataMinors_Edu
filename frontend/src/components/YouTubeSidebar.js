import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Youtube, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  Calendar,
  Clock,
  PlayCircle
} from 'lucide-react';
import { youtubeAPI } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';

const YouTubeSidebar = ({ selectedSessionId, onSessionSelect, onNewSession }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch all sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery(
    'youtube-sessions',
    youtubeAPI.getSessions,
    {
      select: (response) => response.data,
      onError: (error) => {
        console.error('Error fetching YouTube sessions:', error);
      }
    }
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateTitle = (title, maxLength = 35) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Youtube className="h-5 w-5 text-red-600" />
            </div>
            <span className="font-medium text-gray-900">YouTube Summarizer</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* New Session Button */}
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={onNewSession}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">New Summary</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto">
              {sessionsLoading ? (
                <div className="p-4 flex justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <PlayCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mb-2">No summaries yet</p>
                  <p className="text-xs text-gray-400">
                    Create your first YouTube summary to get started
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {sessions.map((session) => (
                    <motion.button
                      key={session.id || session._id}
                      onClick={() => onSessionSelect(session.id || session._id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedSessionId === (session.id || session._id)
                          ? 'bg-red-50 border border-red-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-1.5 rounded ${
                          selectedSessionId === (session.id || session._id)
                            ? 'bg-red-100'
                            : 'bg-gray-100'
                        }`}>
                          <Youtube className={`h-3 w-3 ${
                            selectedSessionId === (session.id || session._id)
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium truncate ${
                            selectedSessionId === (session.id || session._id)
                              ? 'text-red-900'
                              : 'text-gray-900'
                          }`}>
                            {truncateTitle(session.video_title || 'Untitled Video')}
                          </h3>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {formatDate(session.created_at)}
                              </span>
                            </div>
                            
                            {session.video_duration && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {Math.floor(session.video_duration / 60)}m
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {session.chat_history && session.chat_history.length > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {Math.floor(session.chat_history.length / 2)} Q&As
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YouTubeSidebar;
