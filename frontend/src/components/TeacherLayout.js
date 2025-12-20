import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Users, 
  User, 
  LogOut, 
  Menu, 
  X,
  MessageSquare,
  BookOpen,
  DollarSign,
  Star,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const TeacherLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/teacher/dashboard', icon: Home },
    { name: 'My Profile', href: '/teacher/profile/edit', icon: User },
    { name: 'Messages', href: '/teacher/messages', icon: MessageSquare },
    { name: 'Sessions', href: '/teacher/sessions', icon: Calendar },
    { name: 'Earnings', href: '/teacher/earnings', icon: DollarSign },
    { name: 'Reviews', href: '/teacher/reviews', icon: Star },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
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
              className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-indigo-600">PeerLearn Teacher</h1>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                        ${active
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center mb-3">
                  <div className="flex-shrink-0">
                    {user?.avatar ? (
                      <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user?.name} />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">
                          {user?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">Teacher Account</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">PeerLearn Teacher</h1>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              {user?.avatar ? (
                <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user?.name} />
              ) : (
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">Teacher Account</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center px-4 py-2 mb-2 text-xs bg-gray-50 rounded-lg">
            <div className={`h-2 w-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-600">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold text-indigo-600">PeerLearn Teacher</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
