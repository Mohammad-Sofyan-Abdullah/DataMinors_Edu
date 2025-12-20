import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Bold,
  Type,
  MessageSquare,
  Send,
  Loader,
  FileText,
  Sparkles,
  History
} from 'lucide-react';
import { notesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const DocumentEditorPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [fontSize, setFontSize] = useState('16');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch document
  const { data: document, isLoading } = useQuery(
    ['document', documentId],
    () => notesAPI.getDocument(documentId).then(res => res.data),
    {
      onSuccess: (data) => {
        setTitle(data.title);
        setContent(data.content || '');
      },
      onError: () => {
        toast.error('Failed to load document');
        navigate('/notes');
      }
    }
  );

  // Fetch chat history
  const { data: chatData } = useQuery(
    ['document-chat', documentId],
    () => notesAPI.getChatHistory(documentId).then(res => res.data),
    {
      onSuccess: (data) => {
        setChatHistory(data.chat_history || []);
      },
      enabled: !!documentId
    }
  );

  // Update document mutation
  const updateDocumentMutation = useMutation(
    (updateData) => notesAPI.updateDocument(documentId, updateData),
    {
      onSuccess: () => {
        toast.success('Document saved');
        setHasUnsavedChanges(false);
        queryClient.invalidateQueries(['document', documentId]);
      },
      onError: () => toast.error('Failed to save document')
    }
  );

  // Chat mutation
  const chatMutation = useMutation(
    (message) => notesAPI.chatWithDocument(documentId, message),
    {
      onSuccess: (response) => {
        const newMessage = response.data;
        setChatHistory(prev => [...prev, newMessage]);
        setChatMessage('');
        queryClient.invalidateQueries(['document-chat', documentId]);
      },
      onError: () => toast.error('Failed to send message')
    }
  );

  // Generate notes mutation
  const generateNotesMutation = useMutation(
    (prompt) => notesAPI.generateNotes(documentId, prompt),
    {
      onSuccess: (response) => {
        const generatedNotes = response.data.notes;
        // Insert notes at cursor position or end of document
        insertTextAtCursor(generatedNotes);
        toast.success('Notes generated and inserted');
      },
      onError: () => toast.error('Failed to generate notes')
    }
  );

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges && document) {
      const timer = setTimeout(() => {
        handleSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [title, content, hasUnsavedChanges]);

  // Track changes
  useEffect(() => {
    if (document && (title !== document.title || content !== document.content)) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, document]);

  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    
    updateDocumentMutation.mutate({
      title: title.trim(),
      content: content
    });
  };

  const handleBold = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      if (selectedText) {
        const boldText = `**${selectedText}**`;
        range.deleteContents();
        range.insertNode(document.createTextNode(boldText));
        setHasUnsavedChanges(true);
      }
    }
  };

  const insertTextAtCursor = (text) => {
    const editor = editorRef.current;
    if (editor) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const newContent = content.substring(0, start) + '\n\n' + text + '\n\n' + content.substring(end);
      setContent(newContent);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        editor.selectionStart = editor.selectionEnd = start + text.length + 4;
        editor.focus();
      }, 0);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    chatMutation.mutate(chatMessage.trim());
  };

  const handleQuickPrompt = (prompt) => {
    generateNotesMutation.mutate(prompt);
  };

  const quickPrompts = [
    "Make notes from this document",
    "Summarize the key points",
    "Create bullet-point notes",
    "Extract important definitions",
    "Generate study questions"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Editor Area */}
      <div className={`flex-1 flex flex-col ${isChatOpen ? 'mr-80' : ''} transition-all duration-300`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/notes')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-medium bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
                  placeholder="Document title..."
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Formatting Controls */}
              <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
                <button
                  onClick={handleBold}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                  <option value="20">20px</option>
                  <option value="24">24px</option>
                </select>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>
              
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-2 rounded transition-colors ${
                  isChatOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                }`}
                title="Toggle AI Chat"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || updateDocumentMutation.isLoading}
                className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
                  hasUnsavedChanges 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {updateDocumentMutation.isLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your document..."
              className="w-full h-full min-h-[600px] p-6 bg-white rounded-lg border border-gray-200 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                lineHeight: '1.6'
              }}
            />
          </div>
        </div>
      </div>

      {/* AI Chat Sidebar */}
      {isChatOpen && (
        <motion.div
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 flex flex-col"
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">AI Assistant</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Ask questions or request notes generation
            </p>
          </div>

          {/* Quick Prompts */}
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
            <div className="space-y-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={generateNotesMutation.isLoading}
                  className="w-full text-left text-sm p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversation yet</p>
                <p className="text-xs">Ask a question to get started</p>
              </div>
            ) : (
              chatHistory.map((chat, index) => (
                <div key={index} className="space-y-2">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-900">{chat.message}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{chat.response}</p>
                  </div>
                </div>
              ))
            )}
            
            {(chatMutation.isLoading || generateNotesMutation.isLoading) && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {generateNotesMutation.isLoading ? 'Generating notes...' : 'Thinking...'}
                </span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleChatSubmit} className="flex space-x-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask about your document..."
                className="flex-1 input text-sm"
                disabled={chatMutation.isLoading}
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || chatMutation.isLoading}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DocumentEditorPage;