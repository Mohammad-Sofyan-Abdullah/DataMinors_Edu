import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  UserPlus,
  Check,
  X,
  Users,
  UserCheck,
  UserX,
  MessageCircle,
  Inbox,
  User
} from 'lucide-react';
import { friendsAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const FriendsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'friends';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Fetch friends
  const { data: friends = [], isLoading: friendsLoading } = useQuery(
    'friends',
    friendsAPI.getFriends,
    {
      select: (response) => response.data,
    }
  );

  // Fetch friend requests
  const { data: friendRequests = [], isLoading: requestsLoading } = useQuery(
    'friendRequests',
    friendsAPI.getFriendRequests,
    {
      select: (response) => response.data,
    }
  );

  // Mutations
  const sendRequestMutation = useMutation(friendsAPI.sendFriendRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries('friendRequests');
      toast.success('Friend request sent!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send friend request');
    },
  });

  const acceptRequestMutation = useMutation(friendsAPI.acceptFriendRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries(['friendRequests']);
      queryClient.invalidateQueries(['friends']);
      toast.success('Friend request accepted!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to accept friend request');
    },
  });

  const declineRequestMutation = useMutation(friendsAPI.declineFriendRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries('friendRequests');
      toast.success('Friend request declined');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to decline friend request');
    },
  });

  const removeFriendMutation = useMutation(friendsAPI.removeFriend, {
    onSuccess: () => {
      queryClient.invalidateQueries('friends');
      toast.success('Friend removed');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to remove friend');
    },
  });

  // Search logic
  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await friendsAPI.searchUsers(query);
      setSearchResults(response.data);
    } catch (error) {
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  // Handlers
  const handleRemoveFriend = (friendId) => {
    setPendingRemoveId(friendId);
  };

  const confirmRemove = () => {
    if (pendingRemoveId) {
      removeFriendMutation.mutate(pendingRemoveId);
    }
    setPendingRemoveId(null);
  };

  const cancelRemove = () => {
    setPendingRemoveId(null);
  };

  const pendingFriend = pendingRemoveId
    ? friends.find((f) => (f.id || f._id) === pendingRemoveId)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your network and connect with peers</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => handleTabChange('friends')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'friends'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>My Friends</span>
              <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                {friends.length}
              </span>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('requests')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'requests'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              <span>Requests</span>
              {friendRequests.length > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                  {friendRequests.length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => handleTabChange('find')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'find'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Find Friends</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {/* My Friends Tab */}
        {activeTab === 'friends' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {friendsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                  <UserPlus className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No friends yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Start building your network by searching for classmates and sending friend requests.
                </p>
                <button
                  onClick={() => handleTabChange('find')}
                  className="btn-primary"
                >
                  Find Friends
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friends.map((friend) => (
                  <div
                    key={friend.id || friend._id}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {friend.name?.charAt(0) || <User />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{friend.name}</h3>
                          <p className="text-sm text-gray-500">{friend.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/messages/${friend.id || friend._id}`)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                          title="Send message"
                        >
                          <MessageCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.id || friend._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Remove friend"
                        >
                          <UserX className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {friend.bio && (
                      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg line-clamp-2">
                        {friend.bio}
                      </div>
                    )}

                    {friend.study_interests?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {friend.study_interests.slice(0, 3).map((interest, i) => (
                          <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md font-medium">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Friend Requests Tab */}
        {activeTab === 'requests' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-3xl mx-auto"
          >
            {requestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : friendRequests.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No pending requests</h3>
                <p className="text-gray-500">You're all caught up! Check back later.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-900">Pending Requests ({friendRequests.length})</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {friendRequests.map((request) => {
                    const requestId = request.request_id || request._id || request.id;
                    const sender = request.sender || request.user || {};
                    return (
                      <div key={requestId} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                            <UserPlus className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{sender.name || 'Unknown User'}</h4>
                            <p className="text-sm text-gray-500">{sender.email}</p>
                            <p className="text-xs text-gray-400 mt-1">Sent on {new Date(request.created_at || Date.now()).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                          <button
                            onClick={() => acceptRequestMutation.mutate(requestId)}
                            disabled={acceptRequestMutation.isLoading}
                            className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => declineRequestMutation.mutate(requestId)}
                            disabled={declineRequestMutation.isLoading}
                            className="flex-1 sm:flex-none btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Find Friends Tab */}
        {activeTab === 'find' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search for People</h3>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or student ID..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              {searchQuery.length >= 2 && (
                <div className="space-y-4">
                  {isSearching ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {searchResults.map((result) => (
                        <div
                          key={result.user.id || result.user._id}
                          className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                              <User className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{result.user.name}</span>
                              <span className="text-sm text-gray-500">{result.user.email}</span>
                            </div>
                          </div>

                          <div>
                            {result.is_friend ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Check className="h-3 w-3 mr-1" />
                                Friends
                              </span>
                            ) : result.has_pending_request ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {result.request_sent_by_me ? 'Request Sent' : 'Request Received'}
                              </span>
                            ) : (
                              <button
                                onClick={() => sendRequestMutation.mutate(result.user.id || result.user._id)}
                                disabled={sendRequestMutation.isLoading}
                                className="btn-outline btn-sm"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No users found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <ConfirmModal
        open={!!pendingRemoveId}
        title="Remove Friend"
        message={`Are you sure you want to remove ${pendingFriend?.name || 'this friend'}?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
        loading={removeFriendMutation.isLoading}
      />
    </div>
  );
};

export default FriendsPage;
