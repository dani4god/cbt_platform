// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
// Import other page components as we create them
import ExamPage from './pages/ExamPage';
import ExamResultsPage from './pages/ExamResultsPage';

// import ResultsPage from './pages/ResultsPage';

// A simple PrivateRoute component
const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        // You might want a better loading indicator here
        return <div>Loading...</div>;
    }

    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Private Routes */}
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute>
                            <DashboardPage />
                        </PrivateRoute>
                    }
                />
                
                {/* FIXED: Uncommented ExamPage route */}
                <Route
                    path="/exam/:examId"
                    element={
                        <PrivateRoute>
                            <ExamPage />
                        </PrivateRoute>
                    }
                />
                
                {/* ExamResultPage route */}
                <Route
                    path="/exam-results/:pk"
                    element={
                        <PrivateRoute>
                            <ExamResultsPage />
                        </PrivateRoute>
                    }
                />
                


                {/* Placeholder for future private routes */}
                {/* <Route
                    path="/results/:attemptId"
                    element={
                        <PrivateRoute>
                            <ResultsPage />
                        </PrivateRoute>
                    }
                /> */}

                {/* Redirect root to dashboard if logged in, otherwise to login */}
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <Navigate to="/dashboard" />
                        </PrivateRoute>
                    }
                />
                
                {/* Optional: 404 Not Found Page */}
                <Route path="*" element={<div>Page not found</div>} />
            </Routes>
        </Router>
    );
}

export default App;
