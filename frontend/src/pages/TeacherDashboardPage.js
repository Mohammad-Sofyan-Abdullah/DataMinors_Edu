import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profileRes, analyticsRes, requestsRes, sessionsRes] = await Promise.all([
        api.get('/teachers/profile'),
        api.get('/teachers/dashboard/analytics'),
        api.get('/teachers/hire/requests/received'),
        api.get('/teachers/sessions/my-sessions')
      ]);

      setProfile(profileRes.data);
      setAnalytics(analyticsRes.data);
      setRequests(requestsRes.data);
      setSessions(sessionsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await api.put(`/teachers/hire/requests/${requestId}`, { status: action });
      alert(`Request ${action} successfully`);
      fetchDashboardData();
    } catch (error) {
      alert('Failed to update request');
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {profile?.profile_picture && (
                <img
                  src={profile.profile_picture}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.full_name || user?.name}
                </h1>
                <p className="text-sm text-gray-600">
                  Status: <span className={`font-semibold ${profile?.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {profile?.status || 'Pending'}
                  </span>
                </p>
              </div>
            </div>
            <Link
              to="/teacher/profile/edit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm text-gray-600">Total Students</div>
              <div className="text-3xl font-bold text-gray-900">{analytics.total_students}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm text-gray-600">Total Sessions</div>
              <div className="text-3xl font-bold text-gray-900">{analytics.total_sessions}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm text-gray-600">Average Rating</div>
              <div className="text-3xl font-bold text-gray-900">
                {analytics.average_rating.toFixed(1)} ⭐
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm text-gray-600">Pending Requests</div>
              <div className="text-3xl font-bold text-indigo-600">{analytics.pending_requests}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'requests'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Hire Requests ({requests.filter(r => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'sessions'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sessions
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  {requests.length === 0 && sessions.length === 0 ? (
                    <p className="text-gray-600">No recent activity</p>
                  ) : (
                    <div className="space-y-4">
                      {requests.slice(0, 3).map((request) => (
                        <div key={request.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                          <p className="font-medium">New hire request from {request.student.name}</p>
                          <p className="text-sm text-gray-600">
                            Subject: {request.subject} • ${request.total_price}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Hire Requests</h3>
                {requests.length === 0 ? (
                  <p className="text-gray-600">No hire requests yet</p>
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
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
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
                <h3 className="text-lg font-semibold mb-4">Teaching Sessions</h3>
                {sessions.length === 0 ? (
                  <p className="text-gray-600">No sessions scheduled yet</p>
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
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
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
