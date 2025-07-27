// src/config/api.js
// API Configuration matching your Django backend URLs

const API_ENDPOINTS = {
  development: 'http://localhost:8000/',
  production: 'https://your-production-domain.com', // Replace with your actual production URL
  staging: 'https://your-staging-domain.com' // Optional staging environment
};

const getCurrentEnvironment = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }
  
  if (process.env.REACT_APP_API_ENV) {
    return process.env.REACT_APP_API_ENV;
  }
  
  return 'production';
};

const getApiBaseUrl = () => {
  // Allow direct override via environment variable
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  const environment = getCurrentEnvironment();
  return API_ENDPOINTS[environment] || API_ENDPOINTS.production;
};

export const API_BASE_URL = getApiBaseUrl();

// API Configuration matching your Django backend exactly
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  
  // Endpoints matching your Django urls.py
  ENDPOINTS: {
    // Student Portal Endpoints
    EXAMS: {
      AVAILABLE: 'api/exams/available/',
      QUESTIONS: (examId) => `api/exams/${examId}/questions/`,
      START: (examId) => `api/exams/${examId}/start/`,
    },
    
    // Exam Attempt Endpoints
    ATTEMPTS: {
      SUBMIT_ANSWER: (attemptId) => `api/attempts/${attemptId}/submit-answer/`,
      SUBMIT: (attemptId) => `api/attempts/${attemptId}/submit/`,
      RESULTS: (pk) => `api/attempts/${pk}/results/`,
      HISTORY: 'api/attempts/history/',
    },
    
    // Authentication Endpoints (if you have them)
    AUTH: {
      LOGIN: '/auth/login/',
      LOGOUT: '/auth/logout/',
      REGISTER: '/auth/register/',
      REFRESH: '/auth/refresh/',
      TOKEN_VERIFY: '/auth/token/verify/',
    },
    
    // User Profile Endpoints (if you have them)
    USER: {
      PROFILE: '/user/profile/',
      DASHBOARD: '/user/dashboard/',
    }
  }
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 
      'Authorization': `Token ${token}` // Django Rest Framework Token format
    })
  };
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Enhanced API request helper with better error handling
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  const defaultOptions = {
    headers: getAuthHeaders(),
  };

  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, requestOptions);
    
    // Handle different response types
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      // Try to get error details from response
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
      }
      
      throw new Error(errorMessage);
    }
    
    // Handle empty responses (like 204 No Content)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Specific API functions for your exam system
export const examAPI = {
  // Get available exams
  getAvailableExams: () => 
    apiRequest(API_CONFIG.ENDPOINTS.EXAMS.AVAILABLE),
  
  // Get exam questions
  getExamQuestions: (examId) => 
    apiRequest(API_CONFIG.ENDPOINTS.EXAMS.QUESTIONS(examId)),
  
  // Start exam
  startExam: (examId) => 
    apiRequest(API_CONFIG.ENDPOINTS.EXAMS.START(examId), {
      method: 'POST'
    }),
  
  // Submit answer
  submitAnswer: (attemptId, questionId, chosenChoiceId, answerText = '') => 
    apiRequest(API_CONFIG.ENDPOINTS.ATTEMPTS.SUBMIT_ANSWER(attemptId), {
      method: 'POST',
      body: JSON.stringify({
        question_id: questionId,
        chosen_choice_id: chosenChoiceId,
        answer_text: answerText
      })
    }),
  
  // Submit exam
  submitExam: (attemptId) => 
    apiRequest(API_CONFIG.ENDPOINTS.ATTEMPTS.SUBMIT(attemptId), {
      method: 'POST'
    }),
  
  // Get exam results
  getExamResults: (attemptId) => 
    apiRequest(API_CONFIG.ENDPOINTS.ATTEMPTS.RESULTS(attemptId)),
  
  // Get exam history
  getExamHistory: () => 
    apiRequest(API_CONFIG.ENDPOINTS.ATTEMPTS.HISTORY),
};

// Environment info for debugging
export const ENV_INFO = {
  NODE_ENV: process.env.NODE_ENV,
  API_ENV: process.env.REACT_APP_API_ENV,
  API_BASE_URL_OVERRIDE: process.env.REACT_APP_API_BASE_URL,
  CURRENT_ENV: getCurrentEnvironment(),
  FINAL_API_BASE_URL: API_BASE_URL,
};
