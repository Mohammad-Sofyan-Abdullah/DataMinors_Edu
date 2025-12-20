import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { classroomsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import Button from './Button';

const CreateRoomModal = ({ isOpen, onClose, classroomId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const queryClient = useQueryClient();

  const createRoomMutation = useMutation(
    (roomData) => classroomsAPI.createRoom(classroomId, roomData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rooms', classroomId]);
        toast.success('Room created successfully!');
        onClose();
        setFormData({ name: '', description: '' });
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to create room');
      },
    }
  );

  const getSuggestionsMutation = useMutation(
    (subject) => classroomsAPI.suggestRoomNames('Classroom', subject),
    {
      onSuccess: (response) => {
        setSuggestions(response.data.suggestions);
        setIsLoadingSuggestions(false);
      },
      onError: () => {
        setIsLoadingSuggestions(false);
      },
    }
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    createRoomMutation.mutate(formData);
  };

  const handleGetSuggestions = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a subject first');
      return;
    }
    setIsLoadingSuggestions(true);
    setShowSuggestions(true);
    getSuggestionsMutation.mutate(formData.name);
  };

  const selectSuggestion = (suggestion) => {
    setFormData({ ...formData, name: suggestion });
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md"
          >
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Create New Room
                    </h3>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Room Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="input mt-1"
                    placeholder="e.g., Math Discussion, Physics Help"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows="2"
                    value={formData.description}
                    onChange={handleChange}
                    className="input mt-1"
                    placeholder="Describe what this room is for..."
                  />
                  <Button
                    type="button"
                    onClick={handleGetSuggestions}
                    disabled={!formData.name.trim() || isLoadingSuggestions}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    isLoading={isLoadingSuggestions}
                    leftIcon={!isLoadingSuggestions && <Sparkles className="h-4 w-4" />}
                  >
                    Get AI Suggestions
                  </Button>
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Suggested Room Names:</p>
                    <div className="space-y-1">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectSuggestion(suggestion)}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRoomMutation.isLoading}
                    isLoading={createRoomMutation.isLoading}
                    leftIcon={!createRoomMutation.isLoading && <MessageSquare className="h-4 w-4" />}
                  >
                    Create Room
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default CreateRoomModal;



