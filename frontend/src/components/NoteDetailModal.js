import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { X, Download, Star, Eye, FileText, User, MessageCircle, ShoppingCart } from 'lucide-react';
import { marketplaceAPI } from '../utils/api';
import toast from 'react-hot-toast';

const NoteDetailModal = ({ note, onClose, onPurchase }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Fetch reviews
  const { data: reviews = [] } = useQuery(
    ['note-reviews', note.id],
    () => marketplaceAPI.getReviews(note.id).then(res => res.data)
  );

  // Purchase mutation
  const purchaseMutation = useMutation(
    () => marketplaceAPI.purchaseNote(note.id),
    {
      onSuccess: async (response) => {
        toast.success(response.data.message);
        
        // Trigger download
        try {
          const downloadResponse = await marketplaceAPI.downloadNote(note.id);
          const blob = new Blob([downloadResponse.data]);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = note.file_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success('Download started!');
        } catch (error) {
          toast.error('Purchase successful but download failed. Try from My Purchases.');
        }
        
        // Call onPurchase callback which handles wallet refetch in parent
        onPurchase();
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Purchase failed');
      }
    }
  );

  // Review mutation
  const reviewMutation = useMutation(
    () => marketplaceAPI.createReview(note.id, { rating, comment }),
    {
      onSuccess: () => {
        toast.success('Review submitted!');
        setShowReviewForm(false);
        setRating(5);
        setComment('');
        queryClient.invalidateQueries(['note-reviews', note.id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to submit review');
      }
    }
  );

  const handlePurchase = () => {
    if (window.confirm(`Purchase this note for Rs ${note.price} credits?`)) {
      purchaseMutation.mutate();
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    reviewMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                {note.category}
              </span>
              <span className="text-sm text-gray-500">{note.subject}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{note.title}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {note.seller_name}
              </div>
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {note.views} views
              </div>
              <div className="flex items-center">
                <Download className="h-4 w-4 mr-1" />
                {note.downloads} downloads
              </div>
              <div className="flex items-center text-yellow-600">
                <Star className="h-4 w-4 fill-current mr-1" />
                {note.rating.toFixed(1)} ({note.total_reviews} reviews)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Preview */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 flex items-center justify-center">
                <FileText className="h-32 w-32 text-blue-400" />
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{note.description}</p>
              </div>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Reviews ({reviews.length})
                  </h3>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Write a Review
                  </button>
                </div>

                {showReviewForm && (
                  <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                      </label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                star <= rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comment
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your thoughts about these notes..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={reviewMutation.isLoading}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Submit Review
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No reviews yet. Be the first to review!
                    </p>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id} className="border-b border-gray-200 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {review.buyer_name?.[0] || 'U'}
                            </div>
                            <span className="font-medium text-gray-900">{review.buyer_name}</span>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, idx) => (
                              <Star
                                key={idx}
                                className={`h-4 w-4 ${
                                  idx < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 text-sm">{review.comment}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Price Card */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-center mb-4">
                  {note.is_free ? (
                    <div>
                      <p className="text-3xl font-bold text-green-600">Free</p>
                      <p className="text-sm text-gray-600 mt-1">Download now</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-blue-600">Rs {note.price}</p>
                      <p className="text-sm text-gray-600 mt-1">One-time purchase</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={purchaseMutation.isLoading}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  {purchaseMutation.isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {note.is_free ? 'Download' : 'Purchase'}
                    </>
                  )}
                </button>
              </div>

              {/* Info Card */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900">File Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <span className="font-medium text-gray-900">
                      {note.file_name?.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium text-gray-900">
                      {note.file_size ? `${(note.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploaded:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Seller */}
              <button 
                onClick={() => {
                  onClose();
                  navigate(`/messages/${note.seller_id}`);
                }}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Contact Seller
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetailModal;
