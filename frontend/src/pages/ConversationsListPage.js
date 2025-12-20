import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { MessageSquare, Search } from 'lucide-react';
import { messagesAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const ConversationsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery(
    'conversations',
    () => messagesAPI.getConversations(),
    {
      refetchInterval: 5000, // Refresh every 5 seconds
      select: (response) => response.data
    }
  );

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const otherUser = conv.other_user;
    const name = otherUser?.full_name || otherUser?.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleConversationClick = (conversation) => {
    const otherUserId = conversation.other_user?.id;
    if (otherUserId) {
      // Navigate based on user role
      if (user?.role === 'teacher') {
        navigate(`/teacher/messages/${otherUserId}`);
      } else {
        navigate(`/messages/${otherUserId}`);
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-600">
            {user?.role === 'teacher' 
              ? 'Chat with your students' 
              : 'Chat with teachers and friends'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-600">
              {user?.role === 'teacher' 
                ? 'Students will appear here once they message you' 
                : 'Start a conversation by messaging a teacher'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            {filteredConversations.map((conversation) => {
              const otherUser = conversation.other_user;
              const hasUnread = conversation.unread_count > 0;

              return (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    hasUnread ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {otherUser?.avatar ? (
                        <img
                          src={otherUser.avatar}
                          alt={otherUser.full_name || otherUser.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                          {(otherUser?.full_name || otherUser?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-semibold truncate ${
                          hasUnread ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {otherUser?.full_name || otherUser?.name || 'Unknown User'}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTimestamp(conversation.last_message_timestamp)}
                        </span>
                      </div>

                      {/* Role Badge */}
                      {otherUser?.role === 'teacher' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mb-1">
                          Teacher
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${
                          hasUnread ? 'font-medium text-gray-900' : 'text-gray-600'
                        }`}>
                          {conversation.last_message_content || 'No messages yet'}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsListPage;
