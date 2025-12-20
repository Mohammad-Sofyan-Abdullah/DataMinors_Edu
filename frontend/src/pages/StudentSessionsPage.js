import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Calendar, Clock, CheckCircle, Star, Video, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { teachersAPI } from '../utils/api';
import ReviewTeacherModal from '../components/ReviewTeacherModal';
import LoadingSpinner from '../components/LoadingSpinner';

const StudentSessionsPage = () => {
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const queryClient = useQueryClient();

  // Fetch student's sessions (hire requests)
  const { data: sessions = [], isLoading } = useQuery(
    'student-sessions',
    () => teachersAPI.getSentHireRequests().then(res => res.data),
    {
      refetchInterval: 10000 // Refresh every 10 seconds
    }
  );

  // Complete session mutation
  const completeMutation = useMutation(
    (sessionId) => teachersAPI.completeSession(sessionId),
    {
      onSuccess: () => {
        toast.success('Session marked as complete!');
        queryClient.invalidateQueries('student-sessions');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to complete session');
      }
    }
  );

  const handleCompleteSession = (session) => {
    if (window.confirm('Mark this session as complete? You can then leave a review.')) {
      completeMutation.mutate(session.id);
    }
  };

  const handleReviewClick = (session) => {
    setSelectedTeacher(session.teacher);
    setSelectedSession(session);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedTeacher(null);
    setSelectedSession(null);
    queryClient.invalidateQueries('student-sessions');
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return session.status === 'accepted' || session.status === 'pending';
    if (filter === 'completed') return session.status === 'completed';
    if (filter === 'cancelled') return session.status === 'rejected' || session.status === 'cancelled';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Confirmed';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const isUpcoming = (session) => {
    if (!session.start_time) return false;
    const startTime = new Date(session.start_time);
    return startTime > new Date() && (session.status === 'accepted' || session.status === 'pending');
  };

  const isPast = (session) => {
    if (!session.end_time) return false;
    const endTime = new Date(session.end_time);
    return endTime < new Date();
  };

  const canComplete = (session) => {
    // Student can complete session anytime if it's accepted or pending
    return session.status === 'accepted' || session.status === 'pending';
  };

  const canReview = (session) => {
    // Student can review anytime if session is accepted or completed, and not already reviewed
    return (session.status === 'accepted' || session.status === 'completed') && !session.has_review;
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
          <p className="mt-2 text-gray-600">
            Manage your learning sessions with teachers
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-green-600">
                  {sessions.filter(s => isUpcoming(s)).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {sessions.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {sessions.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All ({sessions.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Upcoming ({sessions.filter(s => isUpcoming(s) || s.status === 'accepted').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Completed ({sessions.filter(s => s.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancelled ({sessions.filter(s => s.status === 'rejected' || s.status === 'cancelled').length})
          </button>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No sessions found
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Book a session with a teacher to get started'
                : `No ${filter} sessions`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <div key={session.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  {/* Teacher Info */}
                  <div className="flex items-start gap-4 flex-1">
                    {session.teacher?.profile_picture ? (
                      <img
                        src={session.teacher.profile_picture}
                        alt={session.teacher.name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {session.teacher?.name || 'Unknown Teacher'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                      </div>

                      {/* Session Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">Subject:</span>
                          <span className="text-sm">{session.subject}</span>
                        </div>
                        {session.start_time && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {new Date(session.start_time).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {session.end_time && ` - ${new Date(session.end_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-sm font-medium">Type:</span>
                          <span className="text-sm capitalize">{session.session_type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-sm font-medium">Price:</span>
                          <span className="text-sm font-semibold text-indigo-600">
                            ${session.total_price}
                          </span>
                        </div>
                      </div>

                      {session.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {session.description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        {canComplete(session) && (
                          <button
                            onClick={() => handleCompleteSession(session)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            disabled={completeMutation.isLoading}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {session.status === 'completed' ? 'Completed' : 'Mark Complete'}
                          </button>
                        )}

                        {canReview(session) && (
                          <button
                            onClick={() => handleReviewClick(session)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <Star className="h-4 w-4" />
                            Write Review
                          </button>
                        )}

                        {session.has_review && (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <Star className="h-4 w-4 fill-green-600" />
                            Reviewed
                          </div>
                        )}

                        {isUpcoming(session) && (
                          <div className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                            Upcoming Session
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedTeacher && (
        <ReviewTeacherModal
          isOpen={reviewModalOpen}
          onClose={closeReviewModal}
          teacher={selectedTeacher}
          session={selectedSession}
        />
      )}
    </div>
  );
};

export default StudentSessionsPage;
