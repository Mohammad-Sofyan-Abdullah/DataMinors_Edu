import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function TeacherSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('sessions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, requestsRes] = await Promise.all([
        api.get('/teachers/sessions/my-sessions'),
        api.get('/teachers/hire/requests/received')
      ]);
      setSessions(sessionsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await api.put(`/teachers/hire/requests/${requestId}`, { status: action });
      alert(`Request ${action} successfully`);
      fetchData();
    } catch (error) {
      alert('Failed to update request');
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
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Sessions & Requests</h1>
          <p className="mt-2 text-gray-600">
            Manage your teaching sessions and student requests
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'requests'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Hire Requests ({requests.filter(r => r.status === 'pending').length} pending)
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'sessions'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Sessions ({sessions.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No hire requests yet</p>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            {request.student.avatar && (
                              <img
                                src={request.student.avatar}
                                alt={request.student.name}
                                className="h-10 w-10 rounded-full object-cover mr-3"
                              />
                            )}
                            <div>
                              <h4 className="font-semibold">{request.student.name}</h4>
                              <p className="text-sm text-gray-600">{request.student.email}</p>
                            </div>
                          </div>
                          <div className="space-y-1 mb-3">
                            <p><span className="font-medium">Subject:</span> {request.subject}</p>
                            <p><span className="font-medium">Session Type:</span> {request.session_type}</p>
                            <p><span className="font-medium">Price:</span> ${request.total_price}</p>
                            {request.description && (
                              <p><span className="font-medium">Description:</span> {request.description}</p>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Requested on {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4">
                          {request.status === 'pending' ? (
                            <div className="space-x-2">
                              <button
                                onClick={() => handleRequestAction(request.id, 'accepted')}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRequestAction(request.id, 'rejected')}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No sessions scheduled yet</p>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            {session.other_party.avatar && (
                              <img
                                src={session.other_party.avatar}
                                alt={session.other_party.name}
                                className="h-10 w-10 rounded-full object-cover mr-3"
                              />
                            )}
                            <div>
                              <h4 className="font-semibold">{session.other_party.name}</h4>
                              <p className="text-sm text-gray-600">Student</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p><span className="font-medium">Subject:</span> {session.subject}</p>
                            <p><span className="font-medium">Duration:</span> {session.duration_minutes} minutes</p>
                            {session.scheduled_time && (
                              <p><span className="font-medium">Scheduled:</span> {new Date(session.scheduled_time).toLocaleString()}</p>
                            )}
                            {session.meeting_link && (
                              <p>
                                <span className="font-medium">Meeting Link:</span>{' '}
                                <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                  Join Meeting
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
