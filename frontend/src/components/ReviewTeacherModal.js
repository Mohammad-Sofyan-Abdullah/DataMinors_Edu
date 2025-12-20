import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { teachersAPI } from '../utils/api';

const ReviewTeacherModal = ({ isOpen, onClose, teacher, session }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const reviewMutation = useMutation(
    (reviewData) => teachersAPI.createReview(teacher.id, reviewData),
    {
      onSuccess: () => {
        toast.success('Review submitted successfully!');
        queryClient.invalidateQueries('sent-hire-requests');
        queryClient.invalidateQueries(['teacher', teacher.id]);
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to submit review');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    reviewMutation.mutate({
      rating,
      comment: comment.trim()
    });
  };

  if (!isOpen) return null;

  // Handle both full_name and name properties
  const teacherName = teacher.full_name || teacher.name || 'Teacher';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Review Teacher</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Teacher Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {teacher.profile_picture ? (
              <img
                src={teacher.profile_picture}
                alt={teacherName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                {teacherName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{teacherName}</h3>
              {session && (
                <p className="text-sm text-gray-600">
                  Session: {new Date(session.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {rating === 5 && 'Excellent!'}
                {rating === 4 && 'Very Good'}
                {rating === 3 && 'Good'}
                {rating === 2 && 'Fair'}
                {rating === 1 && 'Poor'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this teacher..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={reviewMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
              disabled={reviewMutation.isLoading || rating === 0 || !comment.trim()}
            >
              {reviewMutation.isLoading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewTeacherModal;
