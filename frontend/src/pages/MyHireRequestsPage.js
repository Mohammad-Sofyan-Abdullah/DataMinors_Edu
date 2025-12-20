import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import api from '../utils/api';
import ReviewTeacherModal from '../components/ReviewTeacherModal';

export default function MyHireRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchHireRequests();
  }, []);

  const fetchHireRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/teachers/hire/requests/sent');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching hire requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReviewClick = (request) => {
    setSelectedTeacher(request.teacher);
    setSelectedSession(request);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedTeacher(null);
    setSelectedSession(null);
    fetchHireRequests(); // Refresh to update review status
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Hire Requests</h1>
          <p className="mt-2 text-gray-600">
            View and manage your teacher hire requests
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't sent any hire requests yet</p>
            <Link
              to="/teachers"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Find Teachers
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      {request.teacher?.profile_picture && (
                        <img
                          src={request.teacher.profile_picture}
                          alt={request.teacher.name}
                          className="h-12 w-12 rounded-full object-cover mr-3"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.teacher?.name || 'Unknown Teacher'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Requested on {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Subject:</span>
                        <p className="text-sm text-gray-900">{request.subject}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Session Type:</span>
                        <p className="text-sm text-gray-900">{request.session_type}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Total Price:</span>
                        <p className="text-sm text-gray-900">${request.total_price}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Payment Status:</span>
                        <p className="text-sm text-gray-900">{request.payment_status}</p>
                      </div>
                    </div>
  
                    {/* Show review button for accepted or completed sessions without review */}
                    {(request.status === 'accepted' || request.status === 'completed') && !request.has_review && (
                      <button
                        onClick={() => handleReviewClick(request)}
                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Star className="h-4 w-4" />
                        Write Review
                      </button>
                    )}
                    
                    {request.has_review && (
                      <div className="mt-3 flex items-center gap-1 text-sm text-green-600">
                        <Star className="h-4 w-4 fill-green-600" />
                        Reviewed
                      </div>
                    )}
                  
                    {request.description && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
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
}
