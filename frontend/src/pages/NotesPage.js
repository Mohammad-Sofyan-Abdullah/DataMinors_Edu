import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Clock,
  File
} from 'lucide-react';
import { notesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';

const NotesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading, refetch } = useQuery(
    ['documents', searchQuery, selectedStatus],
    () => notesAPI.getDocuments({
      search: searchQuery || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined
    }).then(res => res.data),
    {
      onError: () => toast.error('Failed to load documents')
    }
  );

  // Create document mutation
  const createDocumentMutation = useMutation(
    (documentData) => notesAPI.createDocument(documentData),
    {
      onSuccess: (response) => {
        toast.success('Document created successfully');
        setShowCreateModal(false);
        setNewDocumentTitle('');
        queryClient.invalidateQueries('documents');
        navigate(`/notes/${response.data.id || response.data._id}`);
      },
      onError: () => toast.error('Failed to create document')
    }
  );

  // Upload document mutation
  const uploadDocumentMutation = useMutation(
    (formData) => notesAPI.uploadDocument(formData),
    {
      onSuccess: (response) => {
        toast.success('Document uploaded successfully');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        queryClient.invalidateQueries('documents');
        navigate(`/notes/${response.data.id || response.data._id}`);
      },
      onError: () => toast.error('Failed to upload document')
    }
  );

  // Delete document mutation
  const deleteDocumentMutation = useMutation(
    (documentId) => notesAPI.deleteDocument(documentId),
    {
      onSuccess: () => {
        toast.success('Document deleted successfully');
        setDocumentToDelete(null);
        queryClient.invalidateQueries('documents');
      },
      onError: () => toast.error('Failed to delete document')
    }
  );

  const handleCreateDocument = (e) => {
    e.preventDefault();
    if (!newDocumentTitle.trim()) {
      toast.error('Please enter a document title');
      return;
    }
    createDocumentMutation.mutate({
      title: newDocumentTitle.trim(),
      content: ''
    });
  };

  const handleUploadDocument = (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadTitle.trim()) {
      formData.append('title', uploadTitle.trim());
    }

    uploadDocumentMutation.mutate(formData);
  };

  const handleDeleteDocument = (document) => {
    setDocumentToDelete(document);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocumentMutation.mutate(documentToDelete.id || documentToDelete._id);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, edit, and manage your documents with AI assistance
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-outline flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Document</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Document</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Documents</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new document or uploading an existing one.
            </p>
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Document</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-outline flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((document) => (
              <motion.div
                key={document.id || document._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/notes/${document.id || document._id}`)}
              >
                <div className="card-header flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {document.title}
                      </h3>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(document.updated_at)}</span>
                        {document.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(document.file_size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(document);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <span className={`badge ${
                      document.status === 'published' ? 'badge-primary' :
                      document.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {document.status}
                    </span>
                    {document.file_name && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <File className="h-3 w-3" />
                        <span className="truncate max-w-20">{document.file_name}</span>
                      </div>
                    )}
                  </div>
                  {document.content && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {document.content.substring(0, 100)}...
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleCreateDocument}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Create New Document</h3>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={newDocumentTitle}
                  onChange={(e) => setNewDocumentTitle(e.target.value)}
                  placeholder="Enter document title..."
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDocumentTitle('');
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDocumentMutation.isLoading}
                  className="btn-primary"
                >
                  {createDocumentMutation.isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleUploadDocument}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Leave blank to use filename"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    accept=".txt,.docx,.doc,.pdf"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="input w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: TXT, DOCX, DOC, PDF
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadTitle('');
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadDocumentMutation.isLoading}
                  className="btn-primary"
                >
                  {uploadDocumentMutation.isLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteDocumentMutation.isLoading}
      />
    </div>
  );
};

export default NotesPage;