import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// import { Menu, X } from 'lucide-react';
import YouTubeSidebar from '../components/YouTubeSidebar';
import YouTubeSummarizerPage from './YouTubeSummarizerPage';

const YouTubeSummarizerLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Handle session ID from URL parameter (for deep linking from shared content)
  useEffect(() => {
    const sessionFromUrl = searchParams.get('session');
    if (sessionFromUrl && sessionFromUrl !== selectedSessionId) {
      setSelectedSessionId(sessionFromUrl);
      // Clean up the URL parameter after using it
      searchParams.delete('session');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, selectedSessionId, setSearchParams]);

  const handleSessionSelect = (sessionId) => {
    setSelectedSessionId(sessionId);
  };

  const handleNewSession = () => {
    setSelectedSessionId(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex overflow-hidden">

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-80 flex-shrink-0"
          >
            <YouTubeSidebar
              selectedSessionId={selectedSessionId}
              onSessionSelect={handleSessionSelect}
              onNewSession={handleNewSession}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
        <YouTubeSummarizerPage
          selectedSessionId={selectedSessionId}
          onSessionSelect={handleSessionSelect}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
      </div>
    </div>
  );
};

export default YouTubeSummarizerLayout;
