// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = 'https://cbt-platform.onrender.com';

// Create axios instance with interceptors
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Set up axios interceptors for token management
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            setAuthToken(token);
            axiosInstance.defaults.headers.common['Authorization'] = `Token ${token}`;
        }

        // Response interceptor to handle token expiration
        const responseInterceptor = axiosInstance.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // Token is invalid, clear auth state
                    handleTokenExpiration();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axiosInstance.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const handleTokenExpiration = () => {
        setAuthToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
        delete axiosInstance.defaults.headers.common['Authorization'];
    };

    useEffect(() => {
        const loadUserFromStorage = async () => {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                try {
                    setAuthToken(storedToken);
                    axiosInstance.defaults.headers.common['Authorization'] = `Token ${storedToken}`;
                    
                    // Verify token by fetching user profile
                    const response = await axiosInstance.get('profile/');
                    setUser(response.data);
                } catch (error) {
                    console.error('Token verification failed:', error);
                    handleTokenExpiration();
                }
            }
            setLoading(false);
        };

        loadUserFromStorage();
    }, []);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('login/', { email, password });
            const token = response.data.auth_token;
            const userData = response.data.user;

            setAuthToken(token);
            setUser(userData);
            localStorage.setItem('authToken', token);
            localStorage.setItem('userEmail', userData.email);
            axiosInstance.defaults.headers.common['Authorization'] = `Token ${token}`;

            return response.data;
        } catch (error) {
            console.error('Login failed:', error.response?.data || error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (username, email, password, password_confirm) => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('register/', { 
                username, 
                email, 
                password, 
                password_confirm 
            });
            return response.data;
        } catch (error) {
            console.error('Registration failed:', error.response?.data || error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            const currentToken = authToken || localStorage.getItem('authToken');
            
            if (currentToken) {
                await axiosInstance.post('logout/', {});
            }
        } catch (error) {
            console.error('Logout failed on server:', error.response?.data || error.message);
        } finally {
            // Always clear frontend state
            handleTokenExpiration();
            setLoading(false);
        }
    };

    const value = {
        user,
        authToken,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!authToken && !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
