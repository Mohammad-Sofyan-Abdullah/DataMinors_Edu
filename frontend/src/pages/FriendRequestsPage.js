import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import { 
  Check, 
  X, 
  Users,
  UserCheck
} from 'lucide-react';
import { friendsAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const FriendRequestsPage = () => {
  const queryClient = useQueryClient();

  // Fetch friend requests
  const { data: friendRequests = [], isLoading: requestsLoading, error: requestsError } = useQuery(
    ['friendRequests'],
    friendsAPI.getFriendRequests,
    {
      select: (response) => response.data,
      onSuccess: (data) => {
        // helpful debug log to verify payload shape
        console.debug('Fetched friendRequests:', data);
      }
    }
  );

  // Accept friend request mutation
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

  // Decline friend request mutation
  const declineRequestMutation = useMutation(friendsAPI.declineFriendRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries(['friendRequests']);
      toast.success('Friend request declined');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to decline friend request');
    },
  });

  const handleAcceptRequest = (requestId) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleDeclineRequest = (requestId) => {
    declineRequestMutation.mutate(requestId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Friend Requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your incoming friend requests
        </p>
      </div>

      {/* Friend requests */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">
            Pending Requests ({friendRequests.length})
          </h3>
        </div>
        <div className="card-content">
          {requestsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
            ) : requestsError ? (
              <div className="text-center py-8 text-red-600">Error loading requests: {requestsError.message || JSON.stringify(requestsError)}</div>
            ) : friendRequests.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any friend requests at the moment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {friendRequests.map((request, index) => {
                const requestId = request.request_id || request._id || request.id;
                const sender = request.sender || request.user || {};
                const createdAt = request.created_at || request.createdAt || request.timestamp;
                return (
                <motion.div
                  key={requestId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-gray-900">
                        {sender.name || sender.full_name || sender.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sender.email || sender.username || ''}
                      </p>
                      {sender.bio && (
                        <p className="text-xs text-gray-600 mt-1 max-w-md">
                          {sender.bio}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Sent {createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleAcceptRequest(requestId)}
                      disabled={acceptRequestMutation.isLoading}
                      className="btn-primary btn-sm flex items-center"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(requestId)}
                      disabled={declineRequestMutation.isLoading}
                      className="btn-outline btn-sm flex items-center text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </button>
                  </div>
                </motion.div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsPage;
