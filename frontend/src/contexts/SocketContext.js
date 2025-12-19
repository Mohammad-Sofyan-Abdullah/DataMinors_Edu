import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const token = localStorage.getItem('access_token');
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:8000', {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: true
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
        toast.success('Connected to chat server');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
        if (reason === 'io server disconnect') {
          // Server disconnected the socket, need to reconnect manually
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        if (error.message.includes('Authentication')) {
          toast.error('Authentication failed. Please login again.');
        } else {
          toast.error('Connection error. Retrying...');
        }
      });

      newSocket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
      });

      newSocket.on('error', (data) => {
        console.error('Socket error:', data);
        toast.error(data.error || 'Socket error occurred');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    } else {
      // Clean up socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]); // Avoid including socket to prevent reconnection loop

  const joinRoom = (roomId) => {
    if (socket && connected) {
      if (currentRoom) {
        socket.emit('leave_room', currentRoom);
      }
      
      socket.emit('join_room', roomId);
      setCurrentRoom(roomId);
    }
  };

  const leaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leave_room', currentRoom);
      setCurrentRoom(null);
    }
  };

  const sendMessage = (message) => {
    if (socket && connected && currentRoom) {
      socket.emit('send_message', {
        room_id: currentRoom,
        content: message,
        sender_id: user?.id,
      });
    }
  };

  const onNewMessage = (callback) => {
    if (socket) {
      socket.on('new_message', callback);
      return () => socket.off('new_message', callback);
    }
  };

  const onMessageEdited = (callback) => {
    if (socket) {
      socket.on('message_edited', callback);
      return () => socket.off('message_edited', callback);
    }
  };

  const onMessageDeleted = (callback) => {
    if (socket) {
      socket.on('message_deleted', callback);
      return () => socket.off('message_deleted', callback);
    }
  };

  const onUserJoined = (callback) => {
    if (socket) {
      socket.on('user_joined', callback);
      return () => socket.off('user_joined', callback);
    }
  };

  const onUserLeft = (callback) => {
    if (socket) {
      socket.on('user_left', callback);
      return () => socket.off('user_left', callback);
    }
  };

  const value = {
    socket,
    connected,
    currentRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    onNewMessage,
    onMessageEdited,
    onMessageDeleted,
    onUserJoined,
    onUserLeft,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

