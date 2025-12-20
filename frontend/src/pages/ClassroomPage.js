import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
// import { motion } from 'framer-motion'; // Removed unused import
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Users,
  Settings,
  Plus,
  MessageSquare,
  MoreVertical,
  Trash2,
  Edit3,
  UserPlus,
  X,
  Hash,
  Copy,
  Check,
  LogOut
} from 'lucide-react';
import { classroomsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatInterface from '../components/ChatInterface';
import CreateRoomModal from '../components/CreateRoomModal';
import Button from '../components/Button';

const ClassroomPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinRoom, leaveRoom } = useSocket();
  const queryClient = useQueryClient();

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [availableFriends, setAvailableFriends] = useState([]);

  // Fetch classroom details
  const { data: classroom, isLoading: classroomLoading } = useQuery(
    ['classroom', id],
    () => classroomsAPI.getClassroom(id),
    {
      select: (response) => response.data,
      enabled: !!id,
    }
  );

  // Fetch rooms
  const { data: rooms = [], isLoading: roomsLoading } = useQuery(
    ['rooms', id],
    () => classroomsAPI.getRooms(id),
    {
      select: (response) => response.data,
      enabled: !!id,
    }
  );

  // Delete room mutation
  const deleteRoomMutation = useMutation(
    (roomId) => classroomsAPI.deleteRoom(id, roomId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rooms', id]);
        toast.success('Room deleted successfully');
        setShowRoomMenu(null);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to delete room');
        }
      },
    }
  );

  // Add member mutation
  const addMemberMutation = useMutation(
    (userId) => classroomsAPI.addMember(id, userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['classroom', id]);
        queryClient.invalidateQueries(['rooms', id]);
        toast.success('Member added successfully');
        setShowAddMemberModal(false);
        setAvailableFriends([]);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to add member');
        }
      },
    }
  );

  // Update classroom mutation
  const updateClassroomMutation = useMutation(
    (data) => classroomsAPI.updateClassroom(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['classroom', id]);
        toast.success('Classroom updated successfully');
        setShowEditNameModal(false);
        setEditingName('');
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to update classroom');
        }
      },
    }
  );

  // Delete classroom mutation
  const deleteClassroomMutation = useMutation(
    () => classroomsAPI.deleteClassroom(id),
    {
      onSuccess: () => {
        toast.success('Classroom deleted successfully');
        navigate('/dashboard');
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to delete classroom');
        }
      },
    }
  );

  // Leave classroom mutation
  const leaveClassroomMutation = useMutation(
    () => classroomsAPI.leaveClassroom(id),
    {
      onSuccess: () => {
        toast.success('Left classroom successfully');
        navigate('/dashboard');
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to leave classroom');
        }
      },
    }
  );

  // Fetch members
  const { data: members = [] } = useQuery(
    ['members', id],
    () => classroomsAPI.getMembers(id),
    {
      select: (response) => response.data,
      enabled: !!id && showMembersModal,
    }
  );

  // Remove member mutation
  const removeMemberMutation = useMutation(
    (userId) => classroomsAPI.removeMember(id, userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['members', id]);
        queryClient.invalidateQueries(['classroom', id]);
        toast.success('Member removed successfully');
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.detail;
        if (typeof errorMessage === 'string') {
          toast.error(errorMessage);
        } else if (Array.isArray(errorMessage)) {
          const messages = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
          toast.error(messages);
        } else {
          toast.error('Failed to remove member');
        }
      },
    }
  );

  // Set first room as selected when rooms load
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0]);
    }
  }, [rooms, selectedRoom]);

  // Join/leave room when selection changes
  useEffect(() => {
    if (selectedRoom) {
      joinRoom(selectedRoom.id || selectedRoom._id);
    }
    return () => {
      if (selectedRoom) {
        leaveRoom();
      }
    };
  }, [selectedRoom, joinRoom, leaveRoom]);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setShowRoomMenu(null);
  };

  const handleDeleteRoom = (roomId) => {
    if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      deleteRoomMutation.mutate(roomId);
    }
  };

  const handleAddMemberClick = async () => {
    try {
      const response = await classroomsAPI.getAvailableFriends(id);
      setAvailableFriends(response.data);
      setShowAddMemberModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load friends');
    }
  };

  const handleAddMember = (userId) => {
    addMemberMutation.mutate(userId);
  };

  const handleEditClassroomName = () => {
    if (!editingName.trim()) {
      toast.error('Classroom name cannot be empty');
      return;
    }
    updateClassroomMutation.mutate({ name: editingName });
  };

  const handleDeleteClassroom = () => {
    deleteClassroomMutation.mutate();
  };

  const handleCopyInviteCode = () => {
    if (classroom?.invite_code) {
      navigator.clipboard.writeText(classroom.invite_code);
      setCopiedCode(true);
      toast.success('Invite code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Check if current user is admin (handle both string and ObjectId formats)
  const isAdmin = classroom && user && (
    String(classroom.admin_id) === String(user.id) || 
    String(classroom.admin_id) === String(user._id)
  );

  // Debug logging
  console.log('Admin Check:', {
    classroom_admin_id: classroom?.admin_id,
    user_id: user?.id,
    user_underscore_id: user?._id,
    isAdmin
  });

  if (classroomLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Classroom not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The classroom you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button
          onClick={() => navigate('/dashboard')}
          size="md"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {classroom?.name}
                {isAdmin && (
                  <span className="ml-3 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                    ADMIN
                  </span>
                )}
              </h1>
              {classroom?.description && (
                <p className="text-sm text-gray-500">{classroom.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Users className="h-5 w-5" />
              <span className="font-medium">{classroom?.members?.length || 0} members</span>
            </button>
            
            {/* Show buttons for everyone for now - will fix admin check */}
            <button
              onClick={handleAddMemberClick}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span>Add Member</span>
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
            >
              <Copy className="h-5 w-5" />
              <span>Invite Code</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              {showSettingsMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => {
                      setShowMembersModal(true);
                      setShowSettingsMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Users className="h-4 w-4 mr-3" />
                    View Members
                  </button>
                  {isAdmin ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingName(classroom?.name || '');
                          setShowEditNameModal(true);
                          setShowSettingsMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      >
                        <Edit3 className="h-4 w-4 mr-3" />
                        Edit Classroom Name
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowSettingsMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        Delete Classroom
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to leave this classroom?')) {
                          leaveClassroomMutation.mutate();
                        }
                        setShowSettingsMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Leave Classroom
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Rooms */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900">Channels</h2>
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Create Channel"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="p-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div className="p-2">
                {rooms.map((room) => (
                  <div
                    key={room.id || room._id}
                    className={`relative group rounded-lg p-3 cursor-pointer transition-colors ${(selectedRoom?.id || selectedRoom?._id) === (room.id || room._id)
                        ? 'bg-primary-100 text-primary-900'
                        : 'hover:bg-gray-50'
                      }`}
                    onClick={() => handleRoomSelect(room)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        {room.name === 'General' ? (
                          <Hash className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {room.name === 'General' ? 'General Discussion' : room.name}
                        </span>
                      </div>
                      {isAdmin && room.name !== 'General' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRoomMenu(showRoomMenu === (room.id || room._id) ? null : (room.id || room._id));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {room.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {room.description}
                      </p>
                    )}

                    {/* Room menu */}
                    {showRoomMenu === (room.id || room._id) && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement edit room
                            setShowRoomMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Room
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id || room._id);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Room
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main content - Chat */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <ChatInterface
              room={selectedRoom}
              classroom={classroom}
              user={user}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No room selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a room from the sidebar to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <CreateRoomModal
          isOpen={showCreateRoomModal}
          onClose={() => setShowCreateRoomModal(false)}
          classroomId={id}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddMemberModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Friends to Classroom</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {availableFriends.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No friends available to add. All your friends are already members of this classroom.
                </p>
              ) : (
                availableFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{friend.username}</p>
                      <p className="text-sm text-gray-500">{friend.email}</p>
                    </div>
                    <button
                      onClick={() => handleAddMember(friend.id)}
                      disabled={addMemberMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Classroom Name Modal */}
      {showEditNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditNameModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Classroom Name</h3>
              <button
                onClick={() => setShowEditNameModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classroom Name
                </label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter classroom name"
                  onKeyPress={(e) => e.key === 'Enter' && handleEditClassroomName()}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditNameModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditClassroomName}
                  disabled={updateClassroomMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {updateClassroomMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Classroom Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Delete Classroom</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{classroom?.name}</strong>? 
              </p>
              <p className="text-sm text-gray-600">
                This will permanently delete all channels, messages, and data associated with this classroom. This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteClassroom}
                  disabled={deleteClassroomMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleteClassroomMutation.isLoading ? 'Deleting...' : 'Delete Classroom'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Code Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Classroom Invite Code</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Share this code with others to let them join your classroom.
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3">
                  <code className="text-lg font-mono font-semibold text-gray-900">
                    {classroom?.invite_code}
                  </code>
                </div>
                <button
                  onClick={handleCopyInviteCode}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedCode ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              {copiedCode && (
                <p className="text-sm text-green-600 text-center">
                  ✓ Copied to clipboard!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Classroom Members</h3>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {members.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No members found</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name?.charAt(0) || member.username?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">
                              {member.name || member.username}
                            </p>
                            {member.is_admin && (
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>
                      {isAdmin && !member.is_admin && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove ${member.name || member.username} from classroom?`)) {
                              removeMemberMutation.mutate(member.id);
                            }
                          }}
                          disabled={removeMemberMutation.isLoading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomPage;


