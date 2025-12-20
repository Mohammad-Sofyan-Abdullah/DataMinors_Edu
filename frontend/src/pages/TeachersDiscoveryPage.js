import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function TeachersDiscoveryPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: '',
    expertise: '',
    min_rating: '',
    max_price: '',
    language: '',
    search: ''
  });

  useEffect(() => {
    fetchTeachers();
  }, [filters]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/teachers?${params.toString()}`);
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const clearFilters = () => {
    setFilters({
      subject: '',
      expertise: '',
      min_rating: '',
      max_price: '',
      language: '',
      search: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find a Teacher</h1>
          <p className="mt-2 text-gray-600">
            Browse qualified teachers and find the perfect match for your learning needs
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by name, subject, or expertise..."
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                value={filters.subject}
                onChange={handleFilterChange}
                placeholder="e.g., Mathematics"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expertise
              </label>
              <input
                type="text"
                name="expertise"
                value={filters.expertise}
                onChange={handleFilterChange}
                placeholder="e.g., Calculus"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Rating
              </label>
              <select
                name="min_rating"
                value={filters.min_rating}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
                <option value="3.0">3.0+ Stars</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Price per Hour
              </label>
              <input
                type="number"
                name="max_price"
                value={filters.max_price}
                onChange={handleFilterChange}
                placeholder="e.g., 50"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <input
                type="text"
                name="language"
                value={filters.language}
                onChange={handleFilterChange}
                placeholder="e.g., English"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Teachers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading teachers...</div>
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <div className="text-xl text-gray-600">No teachers found</div>
            <p className="mt-2 text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/teachers/${teacher.id}`)}
              >
                <div className="p-6">
                  {/* Profile Picture */}
                  <div className="flex items-center mb-4">
                    {teacher.profile_picture ? (
                      <img
                        src={teacher.profile_picture}
                        alt={teacher.full_name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-2xl text-indigo-600 font-semibold">
                          {teacher.full_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {teacher.full_name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="text-yellow-500">⭐</span>
                        <span className="ml-1">
                          {teacher.average_rating.toFixed(1)} ({teacher.total_reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {teacher.short_bio || 'Experienced teacher ready to help you succeed!'}
                  </p>

                  {/* Expertise Tags */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {teacher.areas_of_expertise.slice(0, 3).map((expertise, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800"
                        >
                          {expertise}
                        </span>
                      ))}
                      {teacher.areas_of_expertise.length > 3 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          +{teacher.areas_of_expertise.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-600">Experience</div>
                      <div className="font-semibold">{teacher.years_of_experience} years</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Students</div>
                      <div className="font-semibold">{teacher.total_students}</div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="border-t pt-4 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        ${teacher.hourly_rate}
                      </span>
                      <span className="text-sm text-gray-600">/hour</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teachers/${teacher.id}`);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
