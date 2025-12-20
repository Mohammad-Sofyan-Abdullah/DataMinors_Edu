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
  MessageSquare,
  Send,
  Loader,
  FileText,
  Sparkles,
  Undo,
  Redo,
  Highlighter,
  Trash2,
  RefreshCw,
  Camera
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
  
  // Simple undo/redo state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Fetch document
  const { data: document, isLoading } = useQuery(
    ['document', documentId],
    () => notesAPI.getDocument(documentId).then(res => res.data),
    {
      onSuccess: (data) => {
        setTitle(data.title);
        setContent(data.content || '');
        setUndoStack([data.content || '']);
        // Set initial content in editor
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '';
        }
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

  // Reprocess OCR mutation
  const reprocessOCRMutation = useMutation(
    () => notesAPI.reprocessWithOCR(documentId),
    {
      onSuccess: (response) => {
        toast.success('Document reprocessed with OCR successfully');
        queryClient.invalidateQueries(['document', documentId]);
        // Refresh the page to show updated content
        window.location.reload();
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail || 'Failed to reprocess document';
        toast.error(errorMessage);
      }
    }
  );
  const deleteDocumentMutation = useMutation(
    () => notesAPI.deleteDocument(documentId),
    {
      onSuccess: () => {
        toast.success('Document deleted');
        navigate('/notes');
      },
      onError: () => toast.error('Failed to delete document')
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
        insertTextAtCursor(generatedNotes);
        toast.success('Notes generated and inserted');
      },
      onError: () => toast.error('Failed to generate notes')
    }
  );

  // Save to undo stack
  const saveToUndoStack = useCallback(() => {
    setUndoStack(prev => {
      const newStack = [...prev];
      if (newStack[newStack.length - 1] !== content) {
        newStack.push(content);
        return newStack.slice(-20);
      }
      return newStack;
    });
    setRedoStack([]);
  }, [content]);

  // Handle content change
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  // Rich text formatting with execCommand
  const applyFormatting = useCallback((command, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      toast.error('Please select text to format');
      return;
    }

    saveToUndoStack();

    try {
      // Focus the editor first
      editor.focus();
      
      // Apply the formatting
      document.execCommand(command, false, value);
      
      // Update content state
      handleContentChange(editor.innerHTML);
      
    } catch (error) {
      console.error('Formatting error:', error);
      // Fallback to manual formatting
      applyManualFormatting(command, value);
    }
  }, [saveToUndoStack, handleContentChange]);

  // Manual formatting fallback
  const applyManualFormatting = useCallback((command, value) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    try {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (!selectedText) return;

      let element;
      switch (command) {
        case 'bold':
          element = document.createElement('strong');
          break;
        case 'italic':
          element = document.createElement('em');
          break;
        case 'underline':
          element = document.createElement('u');
          break;
        case 'hiliteColor':
          element = document.createElement('mark');
          if (value) element.style.backgroundColor = value;
          break;
        default:
          return;
      }

      const fragment = range.extractContents();
      element.appendChild(fragment);
      range.insertNode(element);

      // Clear selection
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(element);
      newRange.collapse(true);
      selection.addRange(newRange);

      handleContentChange(editor.innerHTML);
    } catch (error) {
      console.error('Manual formatting error:', error);
    }
  }, [handleContentChange]);

  const handleBold = useCallback(() => {
    applyFormatting('bold');
  }, [applyFormatting]);

  const handleItalic = useCallback(() => {
    applyFormatting('italic');
  }, [applyFormatting]);

  const handleUnderline = useCallback(() => {
    applyFormatting('underline');
  }, [applyFormatting]);

  const handleHighlight = useCallback(() => {
    applyFormatting('hiliteColor', '#ffff00');
  }, [applyFormatting]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (undoStack.length > 1) {
      const currentContent = undoStack[undoStack.length - 1];
      const previousContent = undoStack[undoStack.length - 2];
      
      setRedoStack(prev => [...prev, currentContent]);
      setUndoStack(prev => prev.slice(0, -1));
      
      setContent(previousContent);
      setHasUnsavedChanges(true);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = previousContent;
      }
    }
  }, [undoStack]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextContent = redoStack[redoStack.length - 1];
      
      setUndoStack(prev => [...prev, content]);
      setRedoStack(prev => prev.slice(0, -1));
      
      setContent(nextContent);
      setHasUnsavedChanges(true);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = nextContent;
      }
    }
  }, [redoStack, content]);

  // Save function
  const handleSave = useCallback(() => {
    if (!hasUnsavedChanges) return;
    
    // Convert HTML to clean text for storage
    let cleanContent = content;
    // Keep basic HTML formatting for storage
    cleanContent = cleanContent.replace(/<div>/g, '\n').replace(/<\/div>/g, '');
    cleanContent = cleanContent.replace(/<br\s*\/?>/g, '\n');
    cleanContent = cleanContent.replace(/&nbsp;/g, ' ');
    
    updateDocumentMutation.mutate({
      title: title.trim(),
      content: cleanContent
    });
  }, [hasUnsavedChanges, title, content, updateDocumentMutation]);

  // Delete function
  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      deleteDocumentMutation.mutate();
    }
  }, [deleteDocumentMutation]);

  // Insert text at cursor
  const insertTextAtCursor = useCallback((text) => {
    saveToUndoStack();
    
    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      
      const selection = window.getSelection();
      let range;
      
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      
      // Create text node
      const textNode = document.createTextNode('\n\n' + text + '\n\n');
      range.insertNode(textNode);
      
      // Move cursor after inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleContentChange(editor.innerHTML);
    }
  }, [saveToUndoStack, handleContentChange]);

  // Handle editor input
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML);
    }
  }, [handleContentChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              handleRedo();
            } else {
              e.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'b':
            e.preventDefault();
            handleBold();
            break;
          case 'i':
            e.preventDefault();
            handleItalic();
            break;
          case 'u':
            e.preventDefault();
            handleUnderline();
            break;
          case 'h':
            e.preventDefault();
            handleHighlight();
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
  }, [handleUndo, handleRedo, handleSave, handleBold, handleItalic, handleUnderline, handleHighlight]);

  // Save to undo stack when content changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveToUndoStack();
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, saveToUndoStack]);

  // Handle chat submit
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    chatMutation.mutate(chatMessage.trim());
  };

  // Handle quick prompts
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
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
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
                  disabled={undoStack.length <= 1}
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="h-4 w-4" />
                </button>
              </div>
              
              {/* Formatting Controls */}
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-4">
                <button
                  onClick={handleBold}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  onClick={handleItalic}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  onClick={handleUnderline}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="h-4 w-4" />
                </button>
                <button
                  onClick={handleHighlight}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Highlight (Ctrl+H)"
                >
                  <Highlighter className="h-4 w-4" />
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
              
              {/* OCR Reprocess Button - Show for images, videos, or failed extractions */}
              {document && (
                (document.file_name && (
                  /\.(jpg|jpeg|png|bmp|tiff|tif|webp|gif|mp4|avi|mov|mkv|wmv|flv|webm|m4v)$/i.test(document.file_name) ||
                  document.extraction_method?.includes('failed') ||
                  document.content?.includes('extraction failed')
                )) && (
                  <button
                    onClick={() => reprocessOCRMutation.mutate()}
                    disabled={reprocessOCRMutation.isLoading}
                    className="p-2 hover:bg-green-100 text-green-600 rounded transition-colors disabled:opacity-50"
                    title="Reprocess with OCR"
                  >
                    {reprocessOCRMutation.isLoading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                )
              )}
              
              <button
                onClick={handleDelete}
                disabled={deleteDocumentMutation.isLoading}
                className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50"
                title="Delete Document"
              >
                {deleteDocumentMutation.isLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
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

        {/* Rich Text Editor */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                className="w-full min-h-[600px] p-6 bg-white rounded-lg border-none resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  lineHeight: '1.6',
                  color: '#374151'
                }}
                spellCheck="true"
                suppressContentEditableWarning={true}
                data-placeholder="Start writing your document..."
              />
            </div>
            
            {/* Status Bar */}
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>{editorRef.current ? editorRef.current.textContent.length : 0} characters</span>
                <span>{editorRef.current ? editorRef.current.textContent.split(/\s+/).filter(word => word.length > 0).length : 0} words</span>
                <span>Undo: {undoStack.length - 1}</span>
                <span>Redo: {redoStack.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <span className="text-orange-500">Unsaved changes</span>
                )}
                <span>Select text and use formatting buttons • Rich text editor</span>
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