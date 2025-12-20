import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function TeacherProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState({
    full_name: user?.name || '',
    short_bio: '',
    areas_of_expertise: [],
    courses_offered: [],
    academic_degrees: [],
    certifications: [],
    years_of_experience: 0,
    languages_spoken: [],
    hourly_rate: '',
    availability_schedule: {},
    online_tools: [],
    portfolio_links: []
  });

  const [currentInput, setCurrentInput] = useState({
    expertise: '',
    course: '',
    degree: '',
    certification: '',
    language: '',
    tool: '',
    link: ''
  });

  useEffect(() => {
    // Check if user already has a profile
    const checkProfile = async () => {
      try {
        await api.get('/teachers/profile');
        // Profile exists, redirect to dashboard
        navigate('/teacher/dashboard');
      } catch (err) {
        // No profile exists, continue with setup
      }
    };
    checkProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleArrayInput = (field, inputField) => {
    if (currentInput[inputField].trim()) {
      setProfileData({
        ...profileData,
        [field]: [...profileData[field], currentInput[inputField].trim()]
      });
      setCurrentInput({ ...currentInput, [inputField]: '' });
    }
  };

  const removeArrayItem = (field, index) => {
    setProfileData({
      ...profileData,
      [field]: profileData[field].filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/teachers/profile', {
        ...profileData,
        hourly_rate: parseFloat(profileData.hourly_rate) || null
      });

      alert('Profile created successfully! Awaiting admin approval.');
      navigate('/teacher/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Set Up Your Teacher Profile
          </h2>
          <p className="text-gray-600 mb-8">
            Complete your profile to start offering teaching services. Your profile will be reviewed by our team before going live.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={profileData.full_name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Short Bio</label>
                  <textarea
                    name="short_bio"
                    value={profileData.short_bio}
                    onChange={handleChange}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Tell students about yourself and your teaching philosophy..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                  <input
                    type="number"
                    name="years_of_experience"
                    value={profileData.years_of_experience}
                    onChange={handleChange}
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Expertise */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas of Expertise</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentInput.expertise}
                  onChange={(e) => setCurrentInput({ ...currentInput, expertise: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayInput('areas_of_expertise', 'expertise'))}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Mathematics, Physics"
                />
                <button
                  type="button"
                  onClick={() => handleArrayInput('areas_of_expertise', 'expertise')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profileData.areas_of_expertise.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('areas_of_expertise', index)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Courses Offered */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Courses/Subjects Offered</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentInput.course}
                  onChange={(e) => setCurrentInput({ ...currentInput, course: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayInput('courses_offered', 'course'))}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Calculus I, Algebra"
                />
                <button
                  type="button"
                  onClick={() => handleArrayInput('courses_offered', 'course')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profileData.courses_offered.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('courses_offered', index)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Academic Degrees */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Degrees</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentInput.degree}
                  onChange={(e) => setCurrentInput({ ...currentInput, degree: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayInput('academic_degrees', 'degree'))}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., PhD in Mathematics, MIT"
                />
                <button
                  type="button"
                  onClick={() => handleArrayInput('academic_degrees', 'degree')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {profileData.academic_degrees.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm text-gray-700">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('academic_degrees', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages Spoken</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentInput.language}
                  onChange={(e) => setCurrentInput({ ...currentInput, language: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayInput('languages_spoken', 'language'))}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., English, Spanish"
                />
                <button
                  type="button"
                  onClick={() => handleArrayInput('languages_spoken', 'language')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profileData.languages_spoken.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('languages_spoken', index)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={profileData.hourly_rate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="50.00"
                />
              </div>
            </div>

            {/* Online Tools */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Online Teaching Tools</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentInput.tool}
                  onChange={(e) => setCurrentInput({ ...currentInput, tool: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleArrayInput('online_tools', 'tool'))}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Zoom, Google Meet"
                />
                <button
                  type="button"
                  onClick={() => handleArrayInput('online_tools', 'tool')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profileData.online_tools.map((item, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeArrayItem('online_tools', index)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Creating Profile...' : 'Create Teacher Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
