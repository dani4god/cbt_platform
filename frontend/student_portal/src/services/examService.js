// src/services/examServices.js

import axios from 'axios';

// Base URL for your Django backend API
const API_BASE_URL = 'http://127.0.0.1:8000/api/';

// Helper function to get the auth token
const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

// Helper function to create authenticated axios instance
const getAxiosInstance = () => {
    const token = getAuthToken();
    if (!token) {
        console.error('Authentication token not found.');
        throw new Error('Authentication token not found');
    }

    return axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
        },
    });
};

const examService = {
    // Test authentication
    testAuth: async () => {
        try {
            const api = getAxiosInstance();
            const response = await api.get('auth/profile/');
            return response.data;
        } catch (error) {
            console.error('Auth test failed:', error);
            throw error;
        }
    },

    getAvailableExams: async () => {
        try {
            const api = getAxiosInstance();
            const response = await api.get('exams/available/'); // Fixed URL
            return response.data;
        } catch (error) {
            console.error('Error fetching available exams:', error);
            throw error;
        }
    },

    getPastExamAttempts: async () => {
        try {
            const api = getAxiosInstance();
            const response = await api.get('attempts/history/');
            return response.data;
        } catch (error) {
            console.error('Error fetching past exam attempts:', error);
            throw error;
        }
    },

    startExam: async (examId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.post(`exams/${examId}/start/`);
            return response.data;
        } catch (error) {
            console.error(`Error starting exam ${examId}:`, error);
            throw error;
        }
    },

    getExamQuestions: async (examId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.get(`exams/${examId}/questions/`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching exam questions for ${examId}:`, error);
            throw error;
        }
    },

    submitAnswer: async (attemptId, questionId, answerData) => {
        try {
            const api = getAxiosInstance();
            const response = await api.post(`attempts/${attemptId}/submit-answer/`, {
                question_id: questionId,
                ...answerData
            });
            return response.data;
        } catch (error) {
            console.error(`Error submitting answer for attempt ${attemptId}:`, error);
            throw error;
        }
    },

    submitExam: async (attemptId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.post(`attempts/${attemptId}/submit/`);
            return response.data;
        } catch (error) {
            console.error(`Error submitting exam ${attemptId}:`, error);
            throw error;
        }
    },

    getExamResults: async (attemptId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.get(`attempts/${attemptId}/results/`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching exam results for ${attemptId}:`, error);
            throw error;
        }
    },
};

export default examService;
