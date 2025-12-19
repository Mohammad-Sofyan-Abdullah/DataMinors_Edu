import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
// import { motion } from 'framer-motion'; // Removed unused import
import { 
  User, 
  Mail, 
  GraduationCap, 
  Edit3, 
  Save, 
  X,
  Camera,
  Plus,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    study_interests: [],
  });
  const [newInterest, setNewInterest] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();

  // Initialize form data when user data loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        study_interests: user.study_interests || [],
      });
    }
  }, [user]);
  
  // Cleanup preview URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updateProfileMutation = useMutation(updateProfile, {
    onSuccess: () => {
      queryClient.invalidateQueries('user');
      setIsEditing(false);
    },
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let profileData = { ...formData };
    
    // Handle file upload if there's a selected file
    if (selectedFile) {
      const base64 = await convertToBase64(selectedFile);
      profileData.avatar = base64;
    }
    
    updateProfileMutation.mutate(profileData);
  };
  
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      bio: user.bio || '',
      study_interests: user.study_interests || [],
    });
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIsEditing(false);
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.study_interests.includes(newInterest.trim())) {
      setFormData({
        ...formData,
        study_interests: [...formData.study_interests, newInterest.trim()],
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest) => {
    setFormData({
      ...formData,
      study_interests: formData.study_interests.filter(i => i !== interest),
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your profile information and preferences
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-outline btn-md flex items-center"
        >
          <Edit3 className="h-4 w-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-content text-center">
              <div className="top-5 relative inline-block mb-3">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {previewUrl || user.avatar ? (
                    <img
                      src={previewUrl || user.avatar}
                      alt={user.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-primary-600" />
                  )}
                </div>
                {isEditing && (
                  <>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <Camera className="h-4 w-4 text-gray-600" />
                    </label>
                  </>
                )}
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {user.name}
              </h2>
              <p className="text-sm text-gray-600 mb-4">{user.email}</p>
              
              {user.student_id && (
                <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  {user.student_id}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Learning Streak:</span>
                  <span className="font-medium">{user.learning_streaks || 0} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Friends:</span>
                  <span className="font-medium">{user.friends?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member since:</span>
                  <span className="font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input mt-1"
                      required
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1 flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      id="bio"
                      rows="3"
                      value={formData.bio}
                      onChange={handleChange}
                      className="input mt-1"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      {user.bio || 'No bio provided'}
                    </p>
                  )}
                </div>

                {/* Study Interests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Study Interests
                  </label>
                  {isEditing ? (
                    <div className="mt-1">
                      <div className="flex space-x-2 mb-2">
                        <input
                          type="text"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="input flex-1"
                          placeholder="Add a study interest"
                        />
                        <button
                          type="button"
                          onClick={addInterest}
                          className="btn-primary btn-md"
                        >
                          <Plus className="h-4 w-4" />
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
                              onClick={() => removeInterest(interest)}
                              className="ml-1 hover:text-primary-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {user.study_interests && user.study_interests.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.study_interests.map((interest, index) => (
                            <span key={index} className="badge-primary">
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No study interests added</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {isEditing && (
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-outline btn-md"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isLoading}
                      className="btn-primary btn-md flex items-center"
                    >
                      {updateProfileMutation.isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;


