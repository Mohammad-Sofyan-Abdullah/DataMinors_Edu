import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function TeacherProfileViewPage() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireData, setHireData] = useState({
    session_type: 'hourly',
    subject: '',
    description: '',
    duration_hours: 1,
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    fetchTeacherProfile();
  }, [teacherId]);

  const fetchTeacherProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/teachers/${teacherId}`);
      setTeacher(response.data);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHireSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert datetime-local to ISO format
      const startTimeISO = hireData.start_time ? new Date(hireData.start_time).toISOString() : null;
      const endTimeISO = hireData.end_time ? new Date(hireData.end_time).toISOString() : null;

      await api.post('/teachers/hire', {
        teacher_id: teacherId,
        ...hireData,
        duration_hours: parseInt(hireData.duration_hours),
        start_time: startTimeISO,
        end_time: endTimeISO
      });
      
      alert('Hire request sent successfully!');
      setShowHireModal(false);
      navigate('/dashboard');
    } catch (error) {
      alert('Failed to send hire request: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleMessageTeacher = async () => {
    try {
      // Create or get conversation with teacher
      const response = await api.post(`/messages/conversations/${teacher.user_id}`);
      console.log('Conversation created:', response.data);
      // Navigate to messages with the teacher's user_id as friendId
      navigate(`/messages/${teacher.user_id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to start conversation: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Teacher not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {teacher.profile_picture ? (
                <img
                  src={teacher.profile_picture}
                  alt={teacher.full_name}
                  className="h-32 w-32 rounded-full object-cover"
                />
              ) : (
                <div className="h-32 w-32 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-5xl text-indigo-600 font-semibold">
                    {teacher.full_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {teacher.full_name}
              </h1>
              
              <div className="flex items-center mb-4">
                <span className="text-yellow-500 text-xl">⭐</span>
                <span className="ml-2 text-lg font-semibold">
                  {teacher.average_rating.toFixed(1)}
                </span>
                <span className="ml-1 text-gray-600">
                  ({teacher.total_reviews} reviews)
                </span>
                <span className="mx-3 text-gray-400">•</span>
                <span className="text-gray-600">
                  {teacher.total_students} students
                </span>
                <span className="mx-3 text-gray-400">•</span>
                <span className="text-gray-600">
                  {teacher.total_sessions} sessions
                </span>
              </div>

              <p className="text-gray-700 mb-4">{teacher.short_bio}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowHireModal(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
                >
                  Hire Teacher
                </button>
                <button
                  onClick={handleMessageTeacher}
                  className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 font-semibold"
                >
                  Send Message
                </button>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-indigo-50 rounded-lg p-6 text-center">
              <div className="text-sm text-gray-600 mb-2">Starting from</div>
              <div className="text-4xl font-bold text-indigo-600">
                ${teacher.hourly_rate}
              </div>
              <div className="text-sm text-gray-600">per hour</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold">Experience:</span>{' '}
                  {teacher.years_of_experience} years
                </div>
                <div>
                  <span className="font-semibold">Languages:</span>{' '}
                  {teacher.languages_spoken.join(', ')}
                </div>
                <div>
                  <span className="font-semibold">Teaching Tools:</span>{' '}
                  {teacher.online_tools.join(', ')}
                </div>
              </div>
            </div>

            {/* Expertise */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Areas of Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {teacher.areas_of_expertise.map((expertise, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 rounded-full bg-indigo-100 text-indigo-800 font-medium"
                  >
                    {expertise}
                  </span>
                ))}
              </div>
            </div>

            {/* Courses */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Courses Offered</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teacher.courses_offered.map((course, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg hover:border-indigo-500 transition-colors"
                  >
                    {course}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Reviews ({teacher.total_reviews})
              </h2>
              {teacher.recent_reviews && teacher.recent_reviews.length > 0 ? (
                <div className="space-y-4">
                  {teacher.recent_reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-start">
                        {review.student_avatar && (
                          <img
                            src={review.student_avatar}
                            alt={review.student_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{review.student_name}</h4>
                            <div className="flex items-center">
                              <span className="text-yellow-500">⭐</span>
                              <span className="ml-1 font-semibold">{review.rating}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No reviews yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Qualifications */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Qualifications</h3>
              
              {teacher.academic_degrees.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Academic Degrees</h4>
                  <ul className="space-y-2">
                    {teacher.academic_degrees.map((degree, index) => (
                      <li key={index} className="text-sm text-gray-600">• {degree}</li>
                    ))}
                  </ul>
                </div>
              )}

              {teacher.certifications.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Certifications</h4>
                  <ul className="space-y-2">
                    {teacher.certifications.map((cert, index) => (
                      <li key={index} className="text-sm text-gray-600">• {cert}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Portfolio Links */}
            {teacher.portfolio_links && teacher.portfolio_links.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Portfolio</h3>
                <div className="space-y-2">
                  {teacher.portfolio_links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-indigo-600 hover:underline text-sm"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hire Modal */}
      {showHireModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Hire {teacher.full_name}</h3>
            
            <form onSubmit={handleHireSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type
                </label>
                <select
                  value={hireData.session_type}
                  onChange={(e) => setHireData({ ...hireData, session_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                >
                  <option value="hourly">Hourly Session</option>
                  <option value="course">Full Course</option>
                  <option value="monthly">Monthly Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={hireData.subject}
                  onChange={(e) => setHireData({ ...hireData, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="e.g., Calculus, Physics"
                />
              </div>

              {hireData.session_type === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={hireData.duration_hours}
                    onChange={(e) => setHireData({ ...hireData, duration_hours: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={hireData.start_time}
                  onChange={(e) => setHireData({ ...hireData, start_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={hireData.end_time}
                  onChange={(e) => setHireData({ ...hireData, end_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details
                </label>
                <textarea
                  value={hireData.description}
                  onChange={(e) => setHireData({ ...hireData, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Tell the teacher about your learning goals..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between text-sm mb-2">
                  <span>Rate:</span>
                  <span>${teacher.hourly_rate}/hour</span>
                </div>
                {hireData.session_type === 'hourly' && (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Hours:</span>
                      <span>{hireData.duration_hours}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${(teacher.hourly_rate * hireData.duration_hours).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowHireModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
