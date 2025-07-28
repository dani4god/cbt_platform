// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest, API_CONFIG, getAuthHeaders } from '../config/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const handleTokenExpiration = () => {
        setAuthToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
    };

    useEffect(() => {
        const loadUserFromStorage = async () => {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                try {
                    setAuthToken(storedToken);
                    
                    // Verify token by fetching user profile
                    const userData = await apiRequest(API_CONFIG.ENDPOINTS.USER.PROFILE);
                    setUser(userData);
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
            const response = await apiRequest(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            const token = response.auth_token || response.token;
            const userData = response.user || response;

            setAuthToken(token);
            setUser(userData);
            localStorage.setItem('authToken', token);
            localStorage.setItem('userEmail', userData.email);

            return response;
        } catch (error) {
            console.error('Login failed:', error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (username, email, password, password_confirm) => {
        setLoading(true);
        try {
            const response = await apiRequest(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
                method: 'POST',
                body: JSON.stringify({ 
                    username, 
                    email, 
                    password, 
                    password_confirm 
                })
            });
            return response;
        } catch (error) {
            console.error('Registration failed:', error.message);
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
                await apiRequest(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
                    method: 'POST'
                });
            }
        } catch (error) {
            console.error('Logout failed on server:', error.message);
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
