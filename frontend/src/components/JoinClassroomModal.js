import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Loader2 } from 'lucide-react';
import { classroomsAPI } from '../utils/api';
import toast from 'react-hot-toast';

const JoinClassroomModal = ({ isOpen, onClose }) => {
  const [inviteCode, setInviteCode] = useState('');
  
  const queryClient = useQueryClient();

  const joinClassroomMutation = useMutation(classroomsAPI.joinClassroom, {
    onSuccess: (response) => {
      queryClient.invalidateQueries('classrooms');
      toast.success('Successfully joined the classroom!');
      onClose();
      setInviteCode('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to join classroom');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    joinClassroomMutation.mutate(inviteCode.trim());
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
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Join Classroom
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
                  <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    name="inviteCode"
                    id="inviteCode"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="input mt-1 text-center text-lg tracking-widest"
                    placeholder="Enter invite code"
                    maxLength="8"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ask your classmate or teacher for the 8-character invite code
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-outline btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={joinClassroomMutation.isLoading || !inviteCode.trim()}
                    className="btn-primary btn-md flex items-center"
                  >
                    {joinClassroomMutation.isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    Join Classroom
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default JoinClassroomModal;



