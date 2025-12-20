import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds default timeout
});

// Create a separate instance for long-running operations
const longRunningApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 600000, // 10 minutes for video processing
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );

          const { access_token, refresh_token: new_refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', new_refresh_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    // Handle other errors
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail.map(d => d.msg || JSON.stringify(d)).join(', '));
      } else {
        toast.error(JSON.stringify(detail));
      }
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// Add the same interceptors to longRunningApi
longRunningApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

longRunningApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );

          const { access_token, refresh_token: new_refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', new_refresh_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return longRunningApi(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    // Handle other errors
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail.map(d => d.msg || JSON.stringify(d)).join(', '));
      } else {
        toast.error(JSON.stringify(detail));
      }
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  verifyEmail: (email, code) => api.post('/auth/verify-email', { email: email, code: code }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/me', userData),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// Friends API
export const friendsAPI = {
  getFriends: () => api.get('/friends/'),
  sendFriendRequest: (receiverId) => api.post(`/friends/send-request/${receiverId}`),
  getFriendRequests: () => api.get('/friends/requests'),
  acceptFriendRequest: (requestId) => api.post(`/friends/accept-request/${requestId}`),
  declineFriendRequest: (requestId) => api.post(`/friends/decline-request/${requestId}`),
  removeFriend: (friendId) => api.delete(`/friends/remove/${friendId}`),
  searchUsers: (query) => api.get(`/friends/search/${query}`),
};

// Classrooms API
export const classroomsAPI = {
  createClassroom: (classroomData) => api.post('/classrooms/', classroomData),
  getClassrooms: () => api.get('/classrooms/'),
  getClassroom: (id) => api.get(`/classrooms/${id}`),
  updateClassroom: (id, data) => api.put(`/classrooms/${id}`, data),
  joinClassroom: (inviteCode) => api.post(`/classrooms/join/${inviteCode}`),
  leaveClassroom: (id) => api.delete(`/classrooms/${id}/leave`),
  deleteClassroom: (id) => api.delete(`/classrooms/${id}`),
  createRoom: (classroomId, roomData) => api.post(`/classrooms/${classroomId}/rooms`, roomData),
  getRooms: (classroomId) => api.get(`/classrooms/${classroomId}/rooms`),
  updateRoom: (classroomId, roomId, data) => api.put(`/classrooms/${classroomId}/rooms/${roomId}`, data),
  deleteRoom: (classroomId, roomId) => api.delete(`/classrooms/${classroomId}/rooms/${roomId}`),
  suggestClassroomNames: (description) => api.get('/classrooms/suggest-names', { params: { description } }),
  suggestRoomNames: (classroomName, subject) => api.get('/classrooms/suggest-room-names', { params: { classroomName, subject } }),
  addMember: (classroomId, userId) => api.post(`/classrooms/${classroomId}/add-member/${userId}`),
  getAvailableFriends: (classroomId) => api.get(`/classrooms/${classroomId}/available-friends`),
};

// Chat API
export const chatAPI = {
  getMessages: (roomId, limit = 50, offset = 0) =>
    api.get(`/chat/rooms/${roomId}/messages`, { params: { limit, offset } }),
  sendMessage: (roomId, content) => api.post(`/chat/rooms/${roomId}/messages`, { content, room_id: roomId }),
  editMessage: (messageId, content) => api.put(`/chat/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`),
  summarizeChat: (roomId) => api.post(`/chat/rooms/${roomId}/summarize`),
};

// YouTube API
export const youtubeAPI = {
  createSession: (videoUrl) => longRunningApi.post('/youtube/sessions', { video_url: videoUrl }),
  getSessions: () => api.get('/youtube/sessions'),
  getSession: (sessionId) => api.get(`/youtube/sessions/${sessionId}`),
  chatWithTranscript: (sessionId, question) => {
    const params = new URLSearchParams();
    params.append('question', question);
    return api.post(`/youtube/sessions/${sessionId}/chat?${params.toString()}`);
  },
  deleteSession: (sessionId) => api.delete(`/youtube/sessions/${sessionId}`),
  regenerateSummaries: (sessionId) => longRunningApi.post(`/youtube/sessions/${sessionId}/regenerate-summaries`),
  exportSession: (sessionId, format) => api.get(`/youtube/sessions/${sessionId}/export/${format}`, {
    responseType: 'blob'
  }),
  generateFlashcards: (sessionId, count = 10) => api.post(`/youtube/sessions/${sessionId}/flashcards`, { count }),
  explainFlashcard: (sessionId, question, answer) => api.post(`/youtube/sessions/${sessionId}/flashcards/explain`, { question, answer }),
  generateSlides: (sessionId, count = 5) => api.post(`/youtube/sessions/${sessionId}/slides`, { count }),
  generateRelatedVideos: (sessionId, count = 8) => api.post(`/youtube/sessions/${sessionId}/related-videos`, { count })
};

// Messages API
export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  createOrGetConversation: (friendId) => api.post(`/messages/conversations/${friendId}`),
  getMessages: (conversationId, limit = 50, offset = 0) =>
    api.get(`/messages/conversations/${conversationId}/messages`, { params: { limit, offset } }),
  sendMessage: (conversationId, formData) =>
    api.post(`/messages/conversations/${conversationId}/messages`, formData),
  deleteMessage: (messageId) => api.delete(`/messages/messages/${messageId}`),
  getUserInfo: (userId) => api.get(`/auth/user/${userId}`),
};

// Marketplace API
export const marketplaceAPI = {
  // Notes
  createNote: (formData) => api.post('/marketplace/notes', formData),
  getNotes: (params) => api.get('/marketplace/notes', { params }),
  getNote: (noteId) => api.get(`/marketplace/notes/${noteId}`),
  getMyNotes: () => api.get('/marketplace/notes/user/my-notes'),
  getMyPurchases: () => api.get('/marketplace/purchases/my-purchases'),
  purchaseNote: (noteId) => api.post(`/marketplace/notes/${noteId}/purchase`),
  downloadNote: (noteId) => api.get(`/marketplace/notes/${noteId}/download`, {
    responseType: 'blob'
  }),

  // Reviews
  getReviews: (noteId) => api.get(`/marketplace/notes/${noteId}/reviews`),
  createReview: (noteId, reviewData) => api.post(`/marketplace/notes/${noteId}/reviews`, reviewData),

  // Wallet
  getWallet: () => api.get('/marketplace/wallet'),

  // Leaderboard
  getLeaderboard: (limit = 10) => api.get('/marketplace/leaderboard', { params: { limit } }),
};

// Notes API
export const notesAPI = {
  getDocuments: (params = {}) => api.get('/notes/documents', { params }),
  createDocument: (documentData) => api.post('/notes/documents', documentData),
  getDocument: (documentId) => api.get(`/notes/documents/${documentId}`),
  updateDocument: (documentId, documentData) => api.put(`/notes/documents/${documentId}`, documentData),
  deleteDocument: (documentId) => api.delete(`/notes/documents/${documentId}`),
  uploadDocument: (formData) => api.post('/notes/documents/upload', formData),
  chatWithDocument: (documentId, message) => api.post(`/notes/documents/${documentId}/chat`, { message }),
  generateNotes: (documentId, prompt) => api.post(`/notes/documents/${documentId}/generate-notes`, { prompt }),
  getChatHistory: (documentId) => api.get(`/notes/documents/${documentId}/chat-history`),
};

// Teachers API
export const teachersAPI = {
  getTeachers: (params = {}) => api.get('/teachers', { params }),
  getTeacher: (teacherId) => api.get(`/teachers/${teacherId}`),
  getMyProfile: () => api.get('/teachers/profile'),
  createProfile: (profileData) => api.post('/teachers/profile', profileData),
  updateProfile: (profileData) => api.put('/teachers/profile', profileData),
  
  // Hire Requests
  createHireRequest: (hireData) => api.post('/teachers/hire', hireData),
  getSentHireRequests: () => api.get('/teachers/hire/requests/sent'),
  getReceivedHireRequests: () => api.get('/teachers/hire/requests/received'),
  updateHireRequest: (requestId, updateData) => api.put(`/teachers/hire/requests/${requestId}`, updateData),
  
  // Sessions
  getMySessions: () => api.get('/teachers/sessions/my-sessions'),
  completeSession: (sessionId) => api.put(`/teachers/sessions/${sessionId}/complete`),
  
  // Reviews
  getTeacherReviews: (teacherId, params = {}) => api.get(`/teachers/${teacherId}/reviews`, { params }),
  createReview: (teacherId, reviewData) => api.post(`/teachers/${teacherId}/reviews`, reviewData),
  
  // Analytics
  getDashboardAnalytics: () => api.get('/teachers/dashboard/analytics'),
};

export default api;


