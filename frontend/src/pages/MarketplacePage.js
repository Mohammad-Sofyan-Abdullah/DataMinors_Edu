import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Upload,
  Search,
  Filter,
  Star,
  Download,
  Eye,
  TrendingUp,
  Wallet,
  FileText,
  DollarSign,
  Award
} from 'lucide-react';
import { marketplaceAPI } from '../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import UploadNoteModal from '../components/UploadNoteModal';
import NoteDetailModal from '../components/NoteDetailModal';

const MarketplacePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Subjects');
  const [sortBy, setSortBy] = useState('recent');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeTab, setActiveTab] = useState('popular');
  const [priceFilter, setPriceFilter] = useState('all'); // all, free, paid

  const categories = [
    'All Subjects',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Engineering',
    'Other'
  ];

  // Fetch notes
  const { data: notes = [], isLoading, refetch } = useQuery(
    ['marketplace-notes', selectedCategory, searchQuery, sortBy, priceFilter],
    () => marketplaceAPI.getNotes({
      category: selectedCategory !== 'All Subjects' ? selectedCategory : undefined,
      search: searchQuery || undefined,
      sort_by: sortBy,
      is_free: priceFilter === 'free' ? true : priceFilter === 'paid' ? false : undefined
    }).then(res => res.data),
    {
      onError: () => toast.error('Failed to load notes')
    }
  );

  // Fetch wallet
  const { data: wallet, refetch: refetchWallet } = useQuery(
    'wallet',
    () => marketplaceAPI.getWallet().then(res => res.data),
    {
      onError: () => toast.error('Failed to load wallet'),
      refetchOnWindowFocus: true
    }
  );

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery(
    'leaderboard',
    () => marketplaceAPI.getLeaderboard().then(res => res.data)
  );

  // Stats calculation
  const stats = {
    totalNotes: notes.length,
    activeUsers: leaderboard.length,
    downloads: notes.reduce((sum, note) => sum + note.downloads, 0),
    credits: wallet?.balance || 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Notes Marketplace</h1>
              <p className="mt-2 text-blue-100">
                Buy and sell high-quality study notes with fellow students
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <div>
                    <p className="text-xs text-blue-100">Your Credits</p>
                    <p className="text-lg font-bold">Rs {stats.credits}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span>Sell Your Notes</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { icon: FileText, label: 'Total Notes', value: stats.totalNotes },
              { icon: Users, label: 'Active Users', value: `${stats.activeUsers}K+` },
              { icon: Download, label: 'Downloads', value: `${stats.downloads}K+` },
              { icon: DollarSign, label: 'Earned', value: `Rs ${wallet?.total_earned || 0}` }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            {/* Search */}
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Search Notes</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                    {selectedCategory === cat && (
                      <span className="ml-2 text-xs">
                        ({notes.length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Price</h3>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Notes' },
                  { value: 'free', label: 'Free' },
                  { value: 'paid', label: 'Premium' }
                ].map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      name="priceFilter"
                      value={option.value}
                      checked={priceFilter === option.value}
                      onChange={(e) => setPriceFilter(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Top Sellers */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Award className="h-4 w-4 mr-2 text-yellow-500" />
                Top Sellers
              </h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((seller, idx) => (
                  <div key={seller.seller_id} className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {seller.seller_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {seller.total_downloads} downloads
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-yellow-600">
                      <Star className="h-3 w-3 fill-current mr-1" />
                      {seller.avg_rating?.toFixed(1) || '0.0'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Tabs & Sort */}
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  {[
                    { id: 'popular', label: 'Popular', icon: TrendingUp },
                    { id: 'recent', label: 'Recent', icon: FileText },
                    { id: 'rating', label: 'Top Rated', icon: Star }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSortBy(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        sortBy === tab.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium">{notes.length}</span> notes
                </p>
              </div>
            </div>

            {/* Notes Grid */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No notes found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your filters or be the first to upload!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map(note => (
                  <motion.div
                    key={note.id || note._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => {
                      console.log('Selected note:', note);
                      setSelectedNote(note);
                    }}
                  >
                    {/* Note Preview */}
                    <div className="h-32 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center relative">
                      <FileText className="h-16 w-16 text-blue-400" />
                      {note.is_free && (
                        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Free
                        </span>
                      )}
                    </div>

                    {/* Note Details */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
                          {note.title}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {note.category}
                        </span>
                        <span>{note.subject}</span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                        {note.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {note.views}
                          </div>
                          <div className="flex items-center">
                            <Download className="h-3 w-3 mr-1" />
                            {note.downloads}
                          </div>
                          <div className="flex items-center text-yellow-600">
                            <Star className="h-3 w-3 fill-current mr-1" />
                            {note.rating.toFixed(1)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {note.seller_name?.[0] || 'U'}
                          </div>
                          <span className="text-xs text-gray-600">{note.seller_name}</span>
                        </div>
                        <div className="text-right">
                          {note.is_free ? (
                            <span className="text-sm font-bold text-green-600">Free</span>
                          ) : (
                            <span className="text-sm font-bold text-blue-600">Rs {note.price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && (
        <UploadNoteModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            refetch();
            toast.success('Note uploaded successfully!');
          }}
        />
      )}

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onPurchase={() => {
            setSelectedNote(null);
            refetch();
            refetchWallet();
          }}
        />
      )}
    </div>
  );
};

// Fix the Users import
const Users = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default MarketplacePage;
