import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Bold,
  Italic,
  Underline,
  Type,
  MessageSquare,
  Send,
  Loader,
  FileText,
  Sparkles,
  History,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight
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
  
  // Undo/Redo functionality
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUpdatingFromHistory, setIsUpdatingFromHistory] = useState(false);

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

  // Initialize history when document loads
  useEffect(() => {
    if (document && content && history.length === 0) {
      setHistory([{ content, title }]);
      setHistoryIndex(0);
    }
  }, [document, content, title, history.length]);

  // Add to history when content changes (debounced)
  const addToHistory = useCallback((newContent, newTitle) => {
    if (isUpdatingFromHistory) return;
    
    const newState = { content: newContent, title: newTitle };
    const currentState = history[historyIndex];
    
    // Don't add if content is the same
    if (currentState && currentState.content === newContent && currentState.title === newTitle) {
      return;
    }
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex, isUpdatingFromHistory]);

  // Debounced history update
  useEffect(() => {
    if (!isUpdatingFromHistory && (content || title)) {
      const timer = setTimeout(() => {
        addToHistory(content, title);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [content, title, addToHistory, isUpdatingFromHistory]);

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUpdatingFromHistory(true);
      const prevState = history[historyIndex - 1];
      setContent(prevState.content);
      setTitle(prevState.title);
      setHistoryIndex(prev => prev - 1);
      setTimeout(() => setIsUpdatingFromHistory(false), 100);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUpdatingFromHistory(true);
      const nextState = history[historyIndex + 1];
      setContent(nextState.content);
      setTitle(nextState.title);
      setHistoryIndex(prev => prev + 1);
      setTimeout(() => setIsUpdatingFromHistory(false), 100);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              if (historyIndex < history.length - 1) {
                setIsUpdatingFromHistory(true);
                const nextState = history[historyIndex + 1];
                setContent(nextState.content);
                setTitle(nextState.title);
                setHistoryIndex(prev => prev + 1);
                setTimeout(() => setIsUpdatingFromHistory(false), 100);
              }
            } else {
              e.preventDefault();
              if (historyIndex > 0) {
                setIsUpdatingFromHistory(true);
                const prevState = history[historyIndex - 1];
                setContent(prevState.content);
                setTitle(prevState.title);
                setHistoryIndex(prev => prev - 1);
                setTimeout(() => setIsUpdatingFromHistory(false), 100);
              }
            }
            break;
          case 'y':
            e.preventDefault();
            if (historyIndex < history.length - 1) {
              setIsUpdatingFromHistory(true);
              const nextState = history[historyIndex + 1];
              setContent(nextState.content);
              setTitle(nextState.title);
              setHistoryIndex(prev => prev + 1);
              setTimeout(() => setIsUpdatingFromHistory(false), 100);
            }
            break;
          case 's':
            e.preventDefault();
            if (hasUnsavedChanges) {
              updateDocumentMutation.mutate({
                title: title.trim(),
                content: content
              });
            }
            break;
          default:
            break;
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [historyIndex, history, hasUnsavedChanges, title, content, updateDocumentMutation]);

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges && document && !isUpdatingFromHistory) {
      const timer = setTimeout(() => {
        handleSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [title, content, hasUnsavedChanges, isUpdatingFromHistory]);

  // Track changes
  useEffect(() => {
    if (document && !isUpdatingFromHistory && (title !== document.title || content !== document.content)) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, document, isUpdatingFromHistory]);

  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    
    updateDocumentMutation.mutate({
      title: title.trim(),
      content: content
    });
  };

  const handleBold = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (selectedText) {
      // Wrap selected text in uppercase for emphasis
      const newText = content.substring(0, start) + selectedText.toUpperCase() + content.substring(end);
      setContent(newText);
      
      // Restore selection
      setTimeout(() => {
        editor.focus();
        editor.setSelectionRange(start, start + selectedText.length);
      }, 0);
    }
  };

  const handleItalic = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (selectedText) {
      // Add emphasis with underscores
      const newText = content.substring(0, start) + '_' + selectedText + '_' + content.substring(end);
      setContent(newText);
      
      setTimeout(() => {
        editor.focus();
        editor.setSelectionRange(start + 1, end + 1);
      }, 0);
    }
  };

  const handleUnderline = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (selectedText) {
      // Add underline effect
      const underline = '─'.repeat(selectedText.length);
      const newText = content.substring(0, start) + selectedText + '\n' + underline + content.substring(end);
      setContent(newText);
      
      setTimeout(() => {
        editor.focus();
        editor.setSelectionRange(start, end);
      }, 0);
    }
  };

  const insertTextAtCursor = (text) => {
    const editor = editorRef.current;
    if (editor) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      
      // Clean the text before inserting
      const cleanText = text.replace(/[#*`>_]/g, '').replace(/\*\*(.*?)\*\*/g, '$1');
      
      const newContent = content.substring(0, start) + '\n\n' + cleanText + '\n\n' + content.substring(end);
      setContent(newContent);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        const newPosition = start + cleanText.length + 4;
        editor.selectionStart = editor.selectionEnd = newPosition;
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
              {/* Undo/Redo Controls */}
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-4">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo"
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo"
                >
                  <Redo className="h-4 w-4" />
                </button>
              </div>
              
              {/* Formatting Controls */}
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-4">
                <button
                  onClick={handleBold}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Bold (Uppercase)"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  onClick={handleItalic}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Italic (Underscores)"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  onClick={handleUnderline}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </button>
              </div>
              
              {/* Font Controls */}
              <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
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
                  <option value="Roboto">Roboto</option>
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your document..."
                className="w-full h-full min-h-[600px] p-6 bg-white rounded-lg border-none resize-none outline-none focus:ring-0"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  lineHeight: '1.6',
                  color: '#374151',
                  backgroundColor: 'white'
                }}
                spellCheck="true"
              />
            </div>
            
            {/* Status Bar */}
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>{content.length} characters</span>
                <span>{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
                <span>{content.split('\n').length} lines</span>
              </div>
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <span className="text-orange-500">Unsaved changes</span>
                )}
                <span>History: {historyIndex + 1}/{history.length}</span>
              </div>
            </div>
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