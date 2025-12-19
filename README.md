# PeerLearn - Study Companion Platform

PeerLearn is a modern, collaborative study platform designed to help students connect, learn, and grow together. Built with FastAPI and React, it provides real-time chat, classroom management, and AI-powered study assistance.

## 🚀 Features

### Module 1: Authentication & User Management
- **Dual Registration**: Google OAuth and Student ID registration
- **Email Verification**: Secure email verification system
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Friend System**: Add, remove, accept/decline friend requests
- **Profile Customization**: Edit bio, avatar, study interests, and learning streaks

### Module 2: Classrooms & Collaboration
- **Classroom Management**: Create/join classrooms with invite codes
- **Subject-wise Rooms**: Organize discussions by subjects (like Discord channels)
- **Real-time Chat**: WebSocket-powered instant messaging
- **Message Management**: Edit, delete, and moderate messages
- **AI Integration**: Chat summarization and content moderation

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **MongoDB**: NoSQL database with Motor async driver
- **JWT**: Secure authentication with refresh tokens
- **WebSockets**: Real-time communication
- **Groq API**: AI-powered chat summarization and moderation
- **Email Service**: SMTP email verification

### Frontend
- **React 18**: Modern React with hooks and context
- **React Router**: Client-side routing
- **React Query**: Server state management
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations
- **Socket.io**: Real-time WebSocket communication
- **React Hook Form**: Form handling
- **React Hot Toast**: Beautiful notifications

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB 4.4+
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd PeerLearn
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp env.example .env

# Edit .env file with your configuration
# Required: MONGODB_URL, SECRET_KEY, GROQ_API_KEY
# Optional: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, EMAIL settings

# Run the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
MONGODB_URL=mongodb://localhost:27017/
DATABASE_NAME=PeerLearn

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret


# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### MongoDB Setup

1. Install MongoDB locally or use MongoDB Atlas
2. Start MongoDB service
3. The application will automatically create the database and collections

## 📱 Usage

### Registration
1. Choose between Google OAuth or Student ID registration
2. Enter your university email and verification code
3. Complete your profile with study interests

### Creating Classrooms
1. Click "Create Classroom" on the dashboard
2. Enter classroom name and description
3. Use AI suggestions for better names
4. Share the invite code with classmates

### Chat Features
1. Join rooms within classrooms
2. Send real-time messages
3. Edit or delete your messages
4. Generate AI summaries of conversations
5. Content moderation for inappropriate messages

### Friend System
1. Search for classmates by name or email
2. Send friend requests
3. Accept/decline incoming requests
4. Manage your friends list

## 🤖 AI Features

### Chat Summarization
- Generate study notes from classroom discussions
- AI-powered content analysis
- Key topics and concepts extraction

### Content Moderation
- Real-time message filtering
- Inappropriate content detection
- Educational environment protection

### Smart Suggestions
- Classroom name suggestions
- Room name recommendations
- Study interest recommendations

## 🏗️ Project Structure

```
PeerLearn/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── auth.py
│   │   ├── email_service.py
│   │   ├── ai_service.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── friends.py
│   │       ├── classrooms.py
│   │       └── chat.py
│   ├── requirements.txt
│   └── env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── utils/
│   │   └── App.js
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Email verification system
- Content moderation and filtering
- CORS protection
- Input validation and sanitization

## 🚀 Deployment

### Backend Deployment
1. Set up a production server (AWS, DigitalOcean, etc.)
2. Install Python and MongoDB
3. Configure environment variables
4. Use a production WSGI server like Gunicorn
5. Set up reverse proxy with Nginx

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to static hosting (Vercel, Netlify, etc.)
3. Configure environment variables for API URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation at `/docs`
- Review the code comments for implementation details

## 🎯 Future Enhancements

- File sharing in chat
- Video/audio calls
- Study group scheduling
- Progress tracking
- Mobile app
- Advanced AI tutoring
- Integration with learning management systems

---

Built with ❤️ for students, by students.



