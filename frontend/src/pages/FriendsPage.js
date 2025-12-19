import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  UserPlus, 
  Check, 
  X, 
  Users,
  UserCheck,
  UserX,
  MessageCircle
} from 'lucide-react';
import { friendsAPI } from '../utils/api';
// import { useAuth } from '../contexts/AuthContext'; // Removed unused import
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const FriendsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Send friend request mutation
  const sendRequestMutation = useMutation(friendsAPI.sendFriendRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries('friendRequests');
      toast.success('Friend request sent!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send friend request');
    },
  });

  // Accept friend request mutation
  const acceptRequestMutation = useMutation(friendsAPI.acceptFriendRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries(['friendRequests', 'friends']);
      toast.success('Friend request accepted!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to accept friend request');
    },
  });

  // Decline friend request mutation
  const declineRequestMutation = useMutation(friendsAPI.declineFriendRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries('friendRequests');
      toast.success('Friend request declined');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to decline friend request');
    },
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation(friendsAPI.removeFriend, {
    onSuccess: () => {
      queryClient.invalidateQueries('friends');
      toast.success('Friend removed');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to remove friend');
    },
  });

  // Search users
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

  const handleSendRequest = (userId) => {
    sendRequestMutation.mutate(userId);
  };

  const handleAcceptRequest = (requestId) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleDeclineRequest = (requestId) => {
    declineRequestMutation.mutate(requestId);
  };

  const handleRemoveFriend = (friendId) => {
    // open modal instead
    setPendingRemoveId(friendId);
  };

  const handleSendMessage = (friendId) => {
    navigate(`/messages/${friendId}`);
  };

  // Local state for confirmation modal
  const [pendingRemoveId, setPendingRemoveId] = useState(null);

  const confirmRemove = () => {
    if (pendingRemoveId) {
      removeFriendMutation.mutate(pendingRemoveId);
    }
    setPendingRemoveId(null);
  };

  const cancelRemove = () => {
    setPendingRemoveId(null);
  };

  // Compute pending friend details for modal message
  const pendingFriend = pendingRemoveId
    ? friends.find((f) => (f.id || f._id) === pendingRemoveId)
    : null;

  const pendingFriendName = pendingFriend ? pendingFriend.name : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
        <p className="mt-1 text-sm text-gray-600">
          Connect with your classmates and study together
        </p>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Find Friends</h3>
        </div>
        <div className="card-content">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or student ID..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="input pl-10"
            />
          </div>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <div className="mt-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.user.id || result.user._id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {result.user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {result.user.email}
                          </p>
                        </div>
                      </div>
                      <div>
                        {result.is_friend ? (
                          <span className="badge-success">Friends</span>
                        ) : result.has_pending_request ? (
                          <span className="badge-warning">
                            {result.request_sent_by_me ? 'Request Sent' : 'Request Received'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(result.user.id || result.user._id)}
                            disabled={sendRequestMutation.isLoading}
                            className="btn-outline btn-sm flex items-center"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No users found matching "{searchQuery}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Friend requests */}
      {friendRequests.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Friend Requests ({friendRequests.length})
            </h3>
          </div>
          <div className="card-content">
            {requestsLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div className="space-y-3">
                {friendRequests.map((request) => (
                  <motion.div
                    key={request.request_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {request.sender.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.sender.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(request.request_id)}
                        disabled={acceptRequestMutation.isLoading}
                        className="btn-primary btn-sm flex items-center"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request.request_id)}
                        disabled={declineRequestMutation.isLoading}
                        className="btn-outline btn-sm flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">
            Your Friends ({friends.length})
          </h3>
        </div>
        <div className="card-content">
          {friendsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No friends yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by searching for your classmates above
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend, index) => (
                <motion.div
                  key={friend.id || friend._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {friend.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {friend.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSendMessage(friend.id || friend._id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Send message"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id || friend._id)}
                        disabled={removeFriendMutation.isLoading}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove friend"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {friend.bio && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                      {friend.bio}
                    </p>
                  )}
                  {friend.study_interests && friend.study_interests.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {friend.study_interests.slice(0, 3).map((interest, idx) => (
                        <span key={idx} className="badge-secondary text-xs">
                          {interest}
                        </span>
                      ))}
                      {friend.study_interests.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{friend.study_interests.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        open={!!pendingRemoveId}
        title="Remove Friend"
        message={
          pendingFriendName
            ? `Are you sure you want to remove ${pendingFriendName} from your friends?`
            : 'Are you sure you want to remove this friend?'
        }
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


