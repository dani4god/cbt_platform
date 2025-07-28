// src/services/examServices.js

import { examAPI, apiRequest, API_CONFIG } from './api';

const examService = {
    // Test authentication
    testAuth: async () => {
        try {
            const response = await apiRequest(API_CONFIG.ENDPOINTS.USER.PROFILE);
            return response;
        } catch (error) {
            console.error('Auth test failed:', error);
            throw error;
        }
    },

    // Get available exams
    getAvailableExams: async () => {
        try {
            return await examAPI.getAvailableExams();
        } catch (error) {
            console.error('Error fetching available exams:', error);
            throw error;
        }
    },

    // Get past exam attempts
    getPastExamAttempts: async () => {
        try {
            return await examAPI.getExamHistory();
        } catch (error) {
            console.error('Error fetching past exam attempts:', error);
            throw error;
        }
    },

    // Start exam
    startExam: async (examId) => {
        try {
            return await examAPI.startExam(examId);
        } catch (error) {
            console.error(`Error starting exam ${examId}:`, error);
            throw error;
        }
    },

    // Get exam questions
    getExamQuestions: async (examId) => {
        try {
            return await examAPI.getExamQuestions(examId);
        } catch (error) {
            console.error(`Error fetching exam questions for ${examId}:`, error);
            throw error;
        }
    },

    // Submit answer
    submitAnswer: async (attemptId, questionId, answerData) => {
        try {
            const { chosen_choice_id, answer_text = '' } = answerData;
            return await examAPI.submitAnswer(attemptId, questionId, chosen_choice_id, answer_text);
        } catch (error) {
            console.error(`Error submitting answer for attempt ${attemptId}:`, error);
            throw error;
        }
    },

    // Submit exam
    submitExam: async (attemptId) => {
        try {
            return await examAPI.submitExam(attemptId);
        } catch (error) {
            console.error(`Error submitting exam ${attemptId}:`, error);
            throw error;
        }
    },

    // Get exam results
    getExamResults: async (attemptId) => {
        try {
            return await examAPI.getExamResults(attemptId);
        } catch (error) {
            console.error(`Error fetching exam results for ${attemptId}:`, error);
            throw error;
        }
    },

    // Additional utility methods
    getUserDashboard: async () => {
        try {
            return await apiRequest(API_CONFIG.ENDPOINTS.USER.DASHBOARD);
        } catch (error) {
            console.error('Error fetching user dashboard:', error);
            throw error;
        }
    },

    // Verify token
    verifyToken: async () => {
        try {
            return await apiRequest(API_CONFIG.ENDPOINTS.AUTH.TOKEN_VERIFY, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Token verification failed:', error);
            throw error;
        }
    }
};

export default examService;
