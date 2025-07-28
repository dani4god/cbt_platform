const API_ENDPOINTS = {
  production: 'https://cbt-platform.onrender.com', 
 
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
      AVAILABLE: '/api/exams/available/',
      QUESTIONS: (examId) => `/api/exams/${examId}/questions/`,
      START: (examId) => `/api/exams/${examId}/start/`,
    },
    
    // Exam Attempt Endpoints
    ATTEMPTS: {
      SUBMIT_ANSWER: (attemptId) => `/api/attempts/${attemptId}/submit-answer/`,
      SUBMIT: (attemptId) => `/api/attempts/${attemptId}/submit/`,
      RESULTS: (pk) => `/api/attempts/${pk}/results/`,
      HISTORY: '/api/attempts/history/',
    },
    
    // Authentication Endpoints
    AUTH: {
      LOGIN: '/api/auth/login/',
      LOGOUT: '/api/auth/logout/',
      REGISTER: '/api/auth/register/',
      REFRESH: '/api/auth/refresh/',
      TOKEN_VERIFY: '/api/auth/token/verify/',
    },
    
    // User Profile Endpoints
    USER: {
      PROFILE: '/api/user/profile/',
      DASHBOARD: '/api/user/dashboard/',
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

// Enhanced API request helper with better error handling and CORS support
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  const defaultOptions = {
    headers: getAuthHeaders(),
    credentials: 'include', // Include cookies for CORS
    mode: 'cors', // Explicitly set CORS mode
  };

  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  let retryCount = 0;
  const maxRetries = API_CONFIG.RETRY_ATTEMPTS;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Making API request to: ${url}`, {
        method: requestOptions.method || 'GET',
        headers: requestOptions.headers
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Handle different response types
      if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        
        // Try to get error details from response
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (typeof errorData === 'object') {
            // Handle validation errors
            const errors = Object.entries(errorData)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join('; ');
            errorMessage = errors || errorMessage;
          }
        } catch (e) {
          // If response is not JSON, use status text
          console.warn('Could not parse error response as JSON');
        }
        
        // Handle specific status codes
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
          localStorage.removeItem('userEmail');
          window.location.href = '/login'; // Redirect to login
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle empty responses (like 204 No Content)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('API Response:', data);
        return data;
      }
      
      return null;
    } catch (error) {
      console.error(`API Request failed (attempt ${retryCount + 1}):`, error.message);
      
      // Don't retry for authentication errors or client errors (4xx)
      if (error.message.includes('401') || error.message.includes('4')) {
        throw error;
      }
      
      retryCount++;
      if (retryCount > maxRetries) {
        throw new Error(`API request failed after ${maxRetries} retries: ${error.message}`);
      }
      
      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
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

// Debug function to log environment info
export const logEnvironmentInfo = () => {
  console.log('Environment Configuration:', ENV_INFO);
};
