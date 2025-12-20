# PeerLearn Teacher Role System

## Overview
The Teacher role is a complete freelancing system where teachers can register, create professional profiles, and offer online teaching services. Students can browse, view, message, and hire teachers for courses or subjects.

---

## Features Implemented

### 🎓 Teacher Features

#### 1. Registration & Authentication
- **Separate teacher registration**: `/teacher/register`
- JWT-based authentication with email verification
- Role-based user accounts (`student` or `teacher`)
- Auto-approval system (can be changed to manual approval)

#### 2. Teacher Profile Management
- **Endpoints**:
  - `POST /teachers/profile` - Create teacher profile
  - `GET /teachers/profile` - Get own profile
  - `PUT /teachers/profile` - Update profile
  - `POST /teachers/profile/picture` - Upload profile picture

- **Profile Fields**:
  - Full name
  - Profile picture
  - Short bio
  - Areas of expertise (tags)
  - Courses/subjects offered
  - Academic degrees and certifications
  - Years of experience
  - Languages spoken
  - Hourly rate
  - Package pricing
  - Availability schedule
  - Online teaching tools
  - Portfolio links

#### 3. Teacher Dashboard
- **Route**: `/teacher/dashboard`
- **Separate Layout**: Teachers have their own navbar and layout
- **Analytics**:
  - Total students
  - Total sessions
  - Average rating
  - Total earnings
  - Pending hire requests
  - Unread messages

- **Tabs**:
  - Overview - Recent activity
  - Hire Requests - Manage student requests
  - Sessions - View and manage teaching sessions

#### 4. Teacher Navigation
- Dashboard
- My Profile (edit)
- Messages (communicate with students)
- Sessions
- Earnings
- Reviews

---

### 👨‍🎓 Student Features

#### 1. Teacher Discovery
- **Route**: `/teachers`
- **Features**:
  - Browse all approved teachers
  - Advanced filtering:
    - Search by name/subject/expertise
    - Filter by subject
    - Filter by expertise
    - Minimum rating
    - Maximum price
    - Language
  - Teacher cards showing:
    - Profile picture
    - Name and rating
    - Bio snippet
    - Expertise tags
    - Experience and student count
    - Hourly rate

#### 2. Teacher Profile View
- **Route**: `/teachers/:teacherId`
- **Information Displayed**:
  - Complete profile details
  - Rating and reviews
  - Areas of expertise
  - Courses offered
  - Qualifications (degrees & certifications)
  - Languages and teaching tools
  - Portfolio links
  - Recent reviews from students

- **Actions**:
  - Hire Teacher button
  - Send Message button

#### 3. Hiring System
- **Hire Request Flow**:
  1. Student sends hire request
  2. Teacher receives notification
  3. Teacher accepts or rejects
  4. If accepted, teaching session is created
  
- **Session Types**:
  - Hourly sessions
  - Full course
  - Monthly plan

- **Hire Request Fields**:
  - Teacher selection
  - Subject
  - Session type
  - Duration (for hourly)
  - Additional description
  - Automatic price calculation

#### 4. Messaging System
- Students can message teachers directly
- Teachers can reply to student messages
- Message history persistence
- File sharing support (optional)

#### 5. Reviews & Ratings
- **Students can**:
  - Rate teachers (1-5 stars)
  - Write review comments
  - Only after completing a session
  
- **Teachers receive**:
  - Average rating calculation
  - Public reviews displayed on profile
  - Total review count

---

## Database Models

### User Model (Extended)
```python
class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.STUDENT
    # ... other fields
```

### Teacher Profile
```python
class TeacherProfile(BaseModel):
    user_id: PyObjectId
    full_name: str
    profile_picture: Optional[str]
    short_bio: Optional[str]
    areas_of_expertise: List[str]
    courses_offered: List[str]
    academic_degrees: List[str]
    certifications: List[str]
    years_of_experience: int
    languages_spoken: List[str]
    hourly_rate: Optional[float]
    package_pricing: Optional[Dict]
    availability_schedule: Dict
    online_tools: List[str]
    portfolio_links: List[str]
    status: TeacherStatus  # pending, approved, rejected, suspended
    average_rating: float
    total_reviews: int
    total_students: int
    total_sessions: int
    total_earnings: float
```

### Hire Request
```python
class HireRequest(BaseModel):
    teacher_id: PyObjectId
    student_id: PyObjectId
    session_type: SessionType  # hourly, course, monthly
    subject: str
    description: Optional[str]
    proposed_schedule: Optional[Dict]
    duration_hours: Optional[int]
    total_price: float
    status: HireRequestStatus  # pending, accepted, rejected, cancelled, completed
    payment_status: str
```

### Teaching Session
```python
class TeachingSession(BaseModel):
    hire_request_id: PyObjectId
    teacher_id: PyObjectId
    student_id: PyObjectId
    subject: str
    scheduled_time: Optional[datetime]
    duration_minutes: int
    meeting_link: Optional[str]
    notes: Optional[str]
    status: str  # scheduled, ongoing, completed, cancelled
```

### Teacher Review
```python
class TeacherReview(BaseModel):
    teacher_id: PyObjectId
    student_id: PyObjectId
    student_name: Optional[str]
    rating: int  # 1-5
    comment: Optional[str]
    session_id: Optional[PyObjectId]
```

---

## API Endpoints

### Teacher Profile
- `POST /teachers/profile` - Create profile
- `GET /teachers/profile` - Get own profile
- `PUT /teachers/profile` - Update profile
- `POST /teachers/profile/picture` - Upload picture

### Teacher Discovery
- `GET /teachers` - List all teachers (with filters)
- `GET /teachers/{teacher_id}` - Get specific teacher profile

### Hire Requests
- `POST /teachers/hire` - Create hire request
- `GET /teachers/hire/requests/sent` - Get student's sent requests
- `GET /teachers/hire/requests/received` - Get teacher's received requests
- `PUT /teachers/hire/requests/{request_id}` - Update request status

### Sessions
- `GET /teachers/sessions/my-sessions` - Get all sessions (teacher or student)

### Reviews
- `POST /teachers/{teacher_id}/reviews` - Create review
- `GET /teachers/{teacher_id}/reviews` - Get teacher reviews

### Analytics
- `GET /teachers/dashboard/analytics` - Get teacher analytics

---

## Frontend Routes

### Public Routes
- `/login` - Login page
- `/register` - Student registration
- `/teacher/register` - Teacher registration

### Teacher Routes (Protected - Teacher Role Only)
- `/teacher/dashboard` - Teacher dashboard
- `/teacher/profile/edit` - Edit profile
- `/teacher/messages` - Messages
- `/teacher/sessions` - Sessions list
- `/teacher/earnings` - Earnings overview
- `/teacher/reviews` - Reviews list

### Student Routes (Protected - Student Role Only)
- `/dashboard` - Student dashboard
- `/teachers` - Browse teachers
- `/teachers/:id` - View teacher profile
- `/my-hire-requests` - View hire requests
- All other student features...

---

## Role-Based Access Control

### Implementation
```javascript
<RoleProtectedRoute allowedRole="teacher">
  <TeacherLayout />
</RoleProtectedRoute>

<RoleProtectedRoute allowedRole="student">
  <Layout />
</RoleProtectedRoute>
```

### Features
- Teachers cannot access student-only features
- Students cannot access teacher-only features
- Automatic redirection based on role
- Separate layouts and navigation for each role

---

## How to Use

### For Teachers:

1. **Register as Teacher**:
   - Go to `/teacher/register`
   - Complete email verification
   - Fill out profile setup form
   - Profile is auto-approved (or awaits admin approval)

2. **Manage Profile**:
   - Navigate to Teacher Dashboard
   - Click "Edit Profile" to update information
   - Upload professional profile picture
   - Add degrees, certifications, expertise areas

3. **Handle Hire Requests**:
   - View incoming requests in Dashboard
   - Accept or reject student requests
   - Accepted requests create teaching sessions

4. **Communicate with Students**:
   - Access Messages from teacher navbar
   - View conversations with students who hired you
   - Respond to inquiries

### For Students:

1. **Find Teachers**:
   - Navigate to "Find Teachers" in sidebar
   - Use filters to narrow search
   - Browse teacher cards

2. **View Teacher Profiles**:
   - Click on any teacher
   - Review qualifications, ratings, reviews
   - Check pricing and availability

3. **Hire a Teacher**:
   - Click "Hire Teacher" button
   - Fill out hire request form
   - Choose session type and subject
   - Submit request

4. **Message Teachers**:
   - Click "Send Message" on teacher profile
   - Start conversation
   - Discuss learning goals

5. **Review Teachers**:
   - After completing a session
   - Rate teacher (1-5 stars)
   - Write review comment

---

## Configuration

### Auto-Approval vs Manual Approval

**Current**: Teachers are auto-approved
```python
profile_dict["status"] = TeacherStatus.APPROVED
```

**To Enable Manual Approval**:
```python
profile_dict["status"] = TeacherStatus.PENDING
```

Then add admin endpoint to approve teachers:
```python
@router.put("/admin/approve-teacher/{teacher_id}")
async def approve_teacher(teacher_id: str):
    await db.teacher_profiles.update_one(
        {"_id": ObjectId(teacher_id)},
        {"$set": {"status": TeacherStatus.APPROVED}}
    )
```

---

## Testing

### Test as Teacher:
1. Register at `/teacher/register`
2. Complete profile setup
3. Access teacher dashboard
4. View received hire requests (none initially)

### Test as Student:
1. Register at `/register`
2. Navigate to "Find Teachers"
3. View teacher profiles
4. Send hire request
5. Message teacher

### Test Interaction:
1. Student sends hire request
2. Teacher receives request in dashboard
3. Teacher accepts request
4. Session is created
5. Both parties can communicate via messages

---

## Future Enhancements

- [ ] Payment integration (Stripe/PayPal)
- [ ] Video call integration (Zoom/Meet API)
- [ ] Calendar synchronization
- [ ] Automated scheduling system
- [ ] Teacher verification badges
- [ ] Advanced analytics for teachers
- [ ] Student learning progress tracking
- [ ] Course material sharing
- [ ] Homework/assignment system
- [ ] Live session recording
- [ ] Certificate generation

---

## File Structure

### Backend
```
backend/app/
├── models.py              # Extended with Teacher models
├── routers/
│   └── teachers.py        # All teacher endpoints
└── main.py               # Includes teacher router
```

### Frontend
```
frontend/src/
├── pages/
│   ├── TeacherRegisterPage.js
│   ├── TeacherProfileSetupPage.js
│   ├── TeacherDashboardPage.js
│   ├── TeachersDiscoveryPage.js
│   ├── TeacherProfileViewPage.js
│   └── MyHireRequestsPage.js
├── components/
│   ├── TeacherLayout.js          # Separate teacher layout
│   └── RoleProtectedRoute.js     # Role-based protection
└── App.js                         # Updated with teacher routes
```

---

## Notes

- Teachers and students use the same messaging system
- Profile pictures are stored in `static/uploads/teachers/profiles/`
- All teacher endpoints are prefixed with `/teachers`
- Teacher role is determined during registration and cannot be changed
- Sessions are automatically created when hire requests are accepted
- Average ratings are recalculated after each new review

---

## Support

For issues or questions:
1. Check the API documentation at `/docs` (FastAPI auto-generated)
2. Review the models in `backend/app/models.py`
3. Check browser console for frontend errors
4. Verify backend logs for API errors

---

**Version**: 1.0.0
**Last Updated**: December 20, 2025
**Author**: Mohammad Sofyan Abdullah (FA22-BDS-047)
