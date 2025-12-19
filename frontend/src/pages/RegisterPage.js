import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, BookOpen, ArrowRight, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const RegisterPage = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Verification, 3: Profile
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    bio: '',
    study_interests: [],
    student_id: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [studyInterest, setStudyInterest] = useState('');
  
  const { register, verifyEmail, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addStudyInterest = () => {
    if (studyInterest.trim() && !formData.study_interests.includes(studyInterest.trim())) {
      setFormData({
        ...formData,
        study_interests: [...formData.study_interests, studyInterest.trim()],
      });
      setStudyInterest('');
    }
  };

  const removeStudyInterest = (interest) => {
    setFormData({
      ...formData,
      study_interests: formData.study_interests.filter(i => i !== interest),
    });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Prepare registration data
    const registrationData = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
    };
    
    // Only include student_id if it's not empty
    if (formData.student_id && formData.student_id.trim() !== '') {
      registrationData.student_id = formData.student_id.trim();
    }
    
    const result = await register(registrationData);
    
    if (result.success) {
      setStep(2);
    }
    
    setIsLoading(false);
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await verifyEmail(formData.email, verificationCode);
      
      if (result.success) {
        toast.success('Email verified successfully!');
        setStep(3);
      } else {
        toast.error(typeof result.error === 'string' ? result.error : 'Verification failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail;
      toast.error(
        typeof errorMessage === 'string' 
          ? errorMessage 
          : Array.isArray(errorMessage)
            ? errorMessage.map(err => err.msg).join(', ')
            : 'Failed to verify email. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Profile is already updated during verification
    navigate('/dashboard');
    setIsLoading(false);
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-center mb-8">
        <BookOpen className="h-12 w-12 text-primary-600" />
        <span className="ml-3 text-3xl font-bold text-gray-900">PeerLearn</span>
      </div>
      
      <div>
        <h2 className="mt-6 text-3xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Join thousands of students learning together
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleEmailSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">
              {typeof error === 'string' ? error : (
                Array.isArray(error) ? error.map(err => err.msg).join(', ') : 'Registration failed'
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="input pl-10"
              placeholder="Enter your full name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            University Email
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="input pl-10"
              placeholder="Enter your university email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="student_id" className="block text-sm font-medium text-gray-700">
            Student ID (Optional)
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GraduationCap className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="student_id"
              name="student_id"
              type="text"
              value={formData.student_id}
              onChange={handleChange}
              className="input pl-10"
              placeholder="Enter your student ID"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="input pl-10 pr-10"
              placeholder="Create a password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input pl-10 pr-10"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || formData.password !== formData.confirmPassword}
            className="btn-primary btn-lg w-full flex items-center justify-center"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
          <Mail className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We've sent a verification code to <strong>{formData.email}</strong>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleVerificationSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{typeof error === 'string' ? error : 'Verification failed'}</div>
          </div>
        )}

        <div>
          <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            id="verificationCode"
            type="text"
            required
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="input text-center text-lg tracking-widest"
            placeholder="Enter 6-digit code"
            maxLength="6"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="btn-primary btn-lg w-full flex items-center justify-center"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Verify Email'
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Didn't receive the code?{' '}
            <button
              type="button"
              className="font-medium text-primary-600 hover:text-primary-500"
              onClick={() => {/* TODO: Implement resend */}}
            >
              Resend code
            </button>
          </p>
        </div>
      </form>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <User className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Complete your profile
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Tell us about your interests to personalize your experience
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleProfileSubmit}>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
            Bio (Optional)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows="3"
            value={formData.bio}
            onChange={handleChange}
            className="input"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Study Interests
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={studyInterest}
              onChange={(e) => setStudyInterest(e.target.value)}
              className="input flex-1"
              placeholder="Add a study interest"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStudyInterest())}
            />
            <button
              type="button"
              onClick={addStudyInterest}
              className="btn-primary btn-md"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.study_interests.map((interest, index) => (
              <span
                key={index}
                className="badge-primary flex items-center space-x-1"
              >
                <span>{interest}</span>
                <button
                  type="button"
                  onClick={() => removeStudyInterest(interest)}
                  className="ml-1 hover:text-primary-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary btn-lg w-full flex items-center justify-center"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left side - Registration form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full gradient-bg">
          <div className="flex h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center text-white px-8"
            >
              <h1 className="text-4xl font-bold mb-6">
                Join the Learning Revolution
              </h1>
              <p className="text-xl mb-8 opacity-90">
                Connect with peers, share knowledge, and achieve your academic goals together
              </p>
              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                  <span>Secure email verification</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                  <span>Personalized learning experience</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                  <span>AI-powered study assistance</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;



