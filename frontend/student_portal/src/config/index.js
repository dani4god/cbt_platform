// src/config/index.js
// Main configuration file - exports everything for easy importing

// API Configuration
export {
  API_BASE_URL,
  API_CONFIG,
  getAuthHeaders,
  buildApiUrl,
  apiRequest,
  examAPI,
  ENV_INFO
} from './api';

// App Constants
export {
  APP_CONFIG,
  STORAGE_KEYS,
  EXAM_CONSTANTS,
  UI_CONSTANTS
} from './constants';

// Default exports for backward compatibility
export { API_BASE_URL as default } from './api';
