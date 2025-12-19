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
  Hash
} from 'lucide-react';
import { classroomsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatInterface from '../components/ChatInterface';
import CreateRoomModal from '../components/CreateRoomModal';

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
        toast.error(error.response?.data?.detail || 'Failed to delete room');
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
        toast.error(error.response?.data?.detail || 'Failed to add member');
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

  const isAdmin = classroom?.admin_id === (user?.id || user?._id);

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
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 btn-primary btn-md"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
            {classroom.description && (
              <p className="text-sm text-gray-600">{classroom.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-sm text-gray-500">
            <Users className="h-4 w-4 mr-1" />
            {classroom.members?.length || 0} members
          </div>
          {isAdmin && (
            <>
              <button 
                onClick={handleAddMemberClick}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Add Member"
              >
                <UserPlus className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Rooms */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900">Rooms</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateRoomModal(true)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
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
                    className={`relative group rounded-lg p-3 cursor-pointer transition-colors ${
                      (selectedRoom?.id || selectedRoom?._id) === (room.id || room._id)
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Member</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {availableFriends.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No friends available to add. All your friends are already members of this classroom.
                </p>
              ) : (
                availableFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{friend.username}</p>
                      <p className="text-sm text-gray-500">{friend.email}</p>
                    </div>
                    <button
                      onClick={() => handleAddMember(friend.id)}
                      disabled={addMemberMutation.isLoading}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addMemberMutation.isLoading ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomPage;


