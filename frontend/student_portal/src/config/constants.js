// src/config/constants.js
// Application constants and configuration

export const APP_CONFIG = {
  NAME: 'Exam System',
  VERSION: '1.0.0',
  AUTHOR: 'Okeke Daniel',
  DESCRIPTION: 'Online Exam Management System',
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  EXAM_PROGRESS: 'examProgress',
  THEME: 'theme',
  LANGUAGE: 'language',
};

// Exam-related constants
export const EXAM_CONSTANTS = {
  QUESTION_TYPES: {
    MULTIPLE_CHOICE: 'Multiple Choice',
    MULTIPLE_SELECT: 'Multiple Select',
    FILL_IN_THE_BLANK: 'Fill-in-the-Blank',
    ESSAY: 'Essay',
    TRUE_FALSE: 'True/False',
  },
  
  EXAM_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
  },
  
  ATTEMPT_STATUS: {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    SUBMITTED: 'submitted',
    GRADED: 'graded',
  },
  
  // Timer warnings
  TIMER_WARNING_THRESHOLD: 300, // 5 minutes in seconds
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};

// UI Constants
export const UI_CONSTANTS = {
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
  },
  
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200,
  },
  
  // Navigation
  ROUTES: {
    HOME: '/',
    DASHBOARD: '/dashboard',
    EXAMS: '/exams',
    EXAM_DETAIL: '/exam/:examId',
    EXAM_TAKE: '/exam/:examId/take',
    EXAM_RESULTS: '/exam-results/:attemptId',
    PROFILE: '/profile',
    LOGIN: '/login',
    REGISTER: '/register',
    LOGOUT: '/logout',
  },
  
  // Messages
  MESSAGES: {
    LOADING: 'Loading...',
    ERROR: 'An error occurred. Please try again.',
    SUCCESS: 'Operation completed successfully.',
    CONFIRM_SUBMIT: 'Are you sure you want to submit this exam?',
    CONFIRM_LOGOUT: 'Are you sure you want to logout?',
    TIME_WARNING: 'Only 5 minutes remaining!',
    AUTO_SUBMIT: 'Time is up! Your exam has been automatically submitted.',
  },
  
  // Form validation
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_USERNAME_LENGTH: 30,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

// Feature flags
export const FEATURES = {
  ENABLE_DARK_MODE: true,
  ENABLE_AUTO_SAVE: true,
  ENABLE_TIMER_WARNINGS: true,
  ENABLE_EXAM_REVIEW: true,
  ENABLE_PRINT_RESULTS: false,
  ENABLE_ANALYTICS: process.env.NODE_ENV === 'production',
  ENABLE_DEBUG: process.env.NODE_ENV === 'development',
};
