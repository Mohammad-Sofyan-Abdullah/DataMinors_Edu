import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ClassroomPage from './pages/ClassroomPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import FriendRequestsPage from './pages/FriendRequestsPage';
import MessagesPage from './pages/MessagesPage';
import YouTubeSummarizerLayout from './pages/YouTubeSummarizerLayout';
import MarketplacePage from './pages/MarketplacePage';
import NotesPage from './pages/NotesPage';
import DocumentEditorPage from './pages/DocumentEditorPage';
import DocumentSessionPage from './pages/DocumentSessionPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="notes" element={<NotesPage />} />
                  <Route path="notes/:documentId" element={<DocumentEditorPage />} />
                  <Route path="notes/session/:sessionId" element={<DocumentSessionPage />} />
                  <Route path="marketplace" element={<MarketplacePage />} />
                  <Route path="classroom/:id" element={<ClassroomPage />} />
                  <Route path="youtube-summarizer" element={<YouTubeSummarizerLayout />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="friends" element={<FriendsPage />} />
                  <Route path="friend-requests" element={<FriendRequestsPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="messages/:friendId" element={<MessagesPage />} />
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>

              {/* Toast notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

