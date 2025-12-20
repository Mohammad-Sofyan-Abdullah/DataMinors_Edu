import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  Home,
  Users,
  User,
  LogOut,
  Menu,
  X,
  MessageSquare,
  BookOpen,
  UserCheck,
  Youtube,
  ShoppingBag,
  Calendar,
  // Settings // Removed unused import
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { friendsAPI, messagesAPI } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const isImmersive = location.pathname.includes('/notes/session') || location.pathname === '/youtube-summarizer';

  // Fetch friend requests count
  const { data: friendRequests = [] } = useQuery(
    'friend-requests-count',
    () => friendsAPI.getFriendRequests().then(res => res.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      enabled: !!user
    }
  );

  // Fetch unread messages count (you'll need to add this endpoint)
  const { data: unreadCount = 0 } = useQuery(
    'unread-messages-count',
    async () => {
      // For now, we'll estimate by checking if there are new messages
      // You can add a proper unread count endpoint later
      return 0; // Placeholder - will be updated with actual logic
    },
    {
      refetchInterval: 10000, // Refetch every 10 seconds
      enabled: !!user
    }
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Notes', href: '/notes', icon: BookOpen },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
    { name: 'Find Teachers', href: '/teachers', icon: UserCheck },
    { name: 'My Sessions', href: '/my-sessions', icon: Calendar },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'YouTube Summarizer', href: '/youtube-summarizer', icon: Youtube },
    { name: 'Friends', href: '/friends', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  // Get notification count for a specific nav item
  const getNotificationCount = (itemName) => {
    if (itemName === 'Messages') return unreadCount;
    if (itemName === 'Friend Requests') return friendRequests.length;
    return 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 ${isImmersive ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="relative flex w-full max-w-xs flex-1 flex-col bg-white"
            >
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex flex-shrink-0 items-center px-4 py-4">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-primary-600" />
                  <span className="ml-2 text-xl font-bold text-gray-900">PeerLearn</span>
                </div>
              </div>
              <div className="mt-5 h-0 flex-1 overflow-y-auto">
                <nav className="space-y-1 px-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          navigate(item.href);
                          setSidebarOpen(false);
                        }}
                        className={`${isActive(item.href)
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex w-full items-center rounded-md px-2 py-2 text-base font-medium relative`}
                      >
                        <Icon className="mr-4 h-6 w-6 flex-shrink-0" />
                        {item.name}
                        {getNotificationCount(item.name) > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                            {getNotificationCount(item.name)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white shadow-lg">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">PeerLearn</span>
              </div>
            </div>
            <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.href)}
                    className={`${isActive(item.href)
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium relative`}
                  >
                    <Icon className="mr-3 h-6 w-6 flex-shrink-0" />
                    {item.name}
                    {getNotificationCount(item.name) > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {getNotificationCount(item.name)}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="group block w-full flex-shrink-0">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`lg:pl-64 flex flex-col ${isImmersive ? 'h-full overflow-hidden' : 'flex-1 min-h-screen'}`}>
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {location.pathname === '/dashboard' && 'Dashboard'}
                    {location.pathname.startsWith('/classroom/') && 'Classroom'}
                    {location.pathname === '/youtube-summarizer' && 'YouTube Summarizer'}
                    {location.pathname === '/friends' && 'Friends'}
                    {location.pathname === '/friend-requests' && 'Friend Requests'}
                    {location.pathname === '/profile' && 'Profile'}
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Connection status */}
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-gray-500">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Logout button */}
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    leftIcon={<LogOut className="h-4 w-4" />}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className={`flex-1 flex flex-col ${location.pathname.includes('/notes/session') || location.pathname === '/youtube-summarizer' ? 'overflow-hidden' : ''}`}>
          <div className={location.pathname.includes('/notes/session') || location.pathname === '/youtube-summarizer' ? "flex-1 flex flex-col h-full min-h-0" : "py-6"}>
            <div className={location.pathname.includes('/notes/session') || location.pathname === '/youtube-summarizer' ? "flex-1 h-full min-h-0 relative" : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

