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
  File,
  Sparkles,
  Play,
  BookOpen,
  Layers
} from 'lucide-react';
import { notesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import Button from '../components/Button';

const NotesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('documents'); // 'documents' or 'sessions'
  const [sessionToDelete, setSessionToDelete] = useState(null);

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

  // Fetch sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery(
    ['documentSessions'],
    () => notesAPI.getSessions().then(res => res.data),
    {
      onError: () => toast.error('Failed to load sessions')
    }
  );

  // Merge documents and sessions
  const unifiedDocuments = documents.map(doc => {
    const session = sessions.find(s => s.document_id === (doc.id || doc._id));
    return { ...doc, session };
  });

  // Create session mutation
  const createSessionMutation = useMutation(
    (documentId) => notesAPI.createSession(documentId),
    {
      onSuccess: (response) => {
        toast.success('AI Session created successfully');
        queryClient.invalidateQueries('documentSessions');
        navigate(`/notes/session/${response.data.id || response.data._id}`);
      },
      onError: () => toast.error('Failed to create session')
    }
  );

  // Delete session mutation
  const deleteSessionMutation = useMutation(
    (sessionId) => notesAPI.deleteSession(sessionId),
    {
      onSuccess: () => {
        toast.success('Session deleted successfully');
        setSessionToDelete(null);
        queryClient.invalidateQueries('documentSessions');
      },
      onError: () => toast.error('Failed to delete session')
    }
  );

  const handleCreateSession = (document) => {
    createSessionMutation.mutate(document.id || document._id);
  };

  const handleDeleteSession = (session) => {
    setSessionToDelete(session);
  };

  const confirmDeleteSession = () => {
    if (sessionToDelete) {
      deleteSessionMutation.mutate(sessionToDelete.id || sessionToDelete._id);
    }
  };

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
              <Button
                onClick={() => setShowUploadModal(true)}
                variant="outline"
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Upload Document
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                New Document
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
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

        {/* Unified Grid */}
        {
          isLoading || sessionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : unifiedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new document or uploading an existing one.
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  New Document
                </Button>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  variant="outline"
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Upload Document
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unifiedDocuments.map((doc) => (
                <motion.div
                  key={doc.id || doc._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full"
                  onClick={() => {
                    if (doc.session) {
                      navigate(`/notes/session/${doc.session.id || doc.session._id}`);
                    } else {
                      navigate(`/notes/${doc.id || doc._id}`);
                    }
                  }}
                >
                  <div className="card-header flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.session ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-blue-100'}`}>
                          {doc.session ? <Sparkles className="h-5 w-5 text-white" /> : <FileText className="h-5 w-5 text-blue-600" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {doc.title}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(doc.updated_at)}</span>
                          {doc.file_size && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 rounded text-red-600"
                      title="Delete Document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="card-content flex-grow flex flex-col justify-end">
                    {doc.session ? (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {doc.session.short_summary && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center space-x-1">
                              <BookOpen className="h-3 w-3" />
                              <span>Summary</span>
                            </span>
                          )}
                          {doc.session.flashcards?.length > 0 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center space-x-1">
                              <Layers className="h-3 w-3" />
                              <span>{doc.session.flashcards.length} Cards</span>
                            </span>
                          )}
                          {doc.session.quiz?.questions?.length > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center space-x-1">
                              <Play className="h-3 w-3" />
                              <span>Quiz</span>
                            </span>
                          )}
                          {doc.session.slides_status === 'completed' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              Slides
                            </span>
                          )}
                        </div>
                        <Button
                          className="w-full justify-center text-sm py-2"
                          leftIcon={<Play className="h-4 w-4" />}
                        >
                          Open Session
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3 h-10">
                          {doc.content ? doc.content.substring(0, 80) + '...' : 'No preview available'}
                        </p>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateSession(doc);
                          }}
                          disabled={createSessionMutation.isLoading}
                          variant="outline"
                          className="w-full justify-center text-sm py-2"
                          isLoading={createSessionMutation.isLoading}
                          leftIcon={!createSessionMutation.isLoading && <Sparkles className="h-4 w-4" />}
                        >
                          Start AI Session
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )
        }
      </div>

      {/* Create Document Modal */}
      {
        showCreateModal && (
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
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewDocumentTitle('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDocumentMutation.isLoading}
                    isLoading={createDocumentMutation.isLoading}
                  >
                    Create
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Upload Document Modal */}
      {
        showUploadModal && (
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select File
                    </label>
                    <input
                      type="file"
                      accept=".txt,.docx,.doc,.pdf,.ppt,.pptx,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.webp,.gif,.mp4,.avi,.mov,.mkv,.wmv,.flv,.webm,.m4v,.xls,.xlsx,.csv,.rtf,.odp,.ods"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="input w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <strong>Supported formats:</strong> Documents (TXT, DOCX, PDF, RTF), Presentations (PPT, PPTX), 
                      Images (JPG, PNG, etc.), Videos (MP4, AVI, etc.), Spreadsheets (XLS, CSV)
                      <br />
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        📷 Images and videos will be processed using AI OCR to extract text
                      </span>
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setUploadTitle('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploadDocumentMutation.isLoading}
                    isLoading={uploadDocumentMutation.isLoading}
                  >
                    Upload
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Delete Document Confirmation Modal */}
      <ConfirmModal
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.title}"? This will also delete the associated AI session and cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteDocumentMutation.isLoading}
      />

      {/* Delete Session Confirmation Modal */}
      <ConfirmModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDeleteSession}
        title="Delete AI Session"
        message={`Are you sure you want to delete the AI session for "${sessionToDelete?.document_title}"? This will delete all generated summaries, flashcards, and quizzes.`}
        confirmText="Delete"
        isLoading={deleteSessionMutation.isLoading}
      />
    </div>
  );
};

export default NotesPage;