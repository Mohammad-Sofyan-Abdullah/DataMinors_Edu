import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Star, MessageSquare, User } from 'lucide-react';
import { teachersAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const TeacherReviewsPage = () => {
  const [filter, setFilter] = useState('all'); // all, 5stars, 4stars, etc.

  // Fetch teacher profile
  const { data: profile } = useQuery('teacher-profile', () => 
    teachersAPI.getMyProfile().then(res => res.data)
  );

  // Fetch reviews
  const { data: reviews = [], isLoading } = useQuery(
    ['teacher-reviews', profile?.id],
    () => {
      if (!profile?.id) return [];
      return teachersAPI.getTeacherReviews(profile.id).then(res => res.data);
    },
    {
      enabled: !!profile?.id
    }
  );

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    if (filter === '5stars') return review.rating === 5;
    if (filter === '4stars') return review.rating === 4;
    if (filter === '3stars') return review.rating === 3;
    if (filter === '2stars') return review.rating === 2;
    if (filter === '1star') return review.rating === 1;
    return true;
  });

  // Calculate rating distribution
  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : 0;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Reviews</h1>
          <p className="mt-2 text-gray-600">
            See what your students are saying about you
          </p>
        </div>

        {/* Overall Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-5xl font-bold text-gray-900">{averageRating}</span>
                <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-gray-600">Based on {totalReviews} reviews</p>
              <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-12">{rating} star</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All ({totalReviews})
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setFilter(`${rating}star${rating > 1 ? 's' : ''}`)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === `${rating}star${rating > 1 ? 's' : ''}`
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {rating} ⭐ ({ratingDistribution[rating]})
            </button>
          ))}
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No reviews yet' : 'No reviews match this filter'}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Reviews from your students will appear here after completed sessions'
                : 'Try selecting a different rating filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-4">
                  {/* Student Avatar */}
                  {review.student_avatar ? (
                    <img
                      src={review.student_avatar}
                      alt={review.student_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                  )}

                  {/* Review Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {review.student_name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm text-gray-600 font-medium">
                            {review.rating}.0
                          </span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherReviewsPage;
