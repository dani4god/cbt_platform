// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { examAPI } from '../config/api';
import '../styles/DashboardPage.css';

const DashboardPage = () => {
  const [availableExams, setAvailableExams] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch available exams and exam history using the new API
      const [examsResponse, historyResponse] = await Promise.all([
        examAPI.getAvailableExams(),
        examAPI.getExamHistory()
      ]);

      setAvailableExams(examsResponse || []);
      setExamHistory(historyResponse || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (examId) => {
    try {
      // Use the new API to start exam
      const response = await examAPI.startExam(examId);
      
      if (response) {
        // Navigate to exam page with the attempt ID
        navigate(`/exam/${examId}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to start exam');
      console.error('Start exam error:', err);
    }
  };

  const handleViewResults = (attemptId) => {
    navigate(`/exam-results/${attemptId}`);
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      // Force navigation and clear any cached data
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout. Please try again.');
      // Even if logout fails, try to navigate to login
      navigate('/login');
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const filteredExams = availableExams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exam.description && exam.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUserStats = () => {
    const totalAttempts = examHistory.length;
    const completedExams = examHistory.filter(attempt => 
      attempt.is_completed === true
    ).length;
    
    const averageScore = examHistory.length > 0 
      ? examHistory.reduce((sum, attempt) => sum + (parseFloat(attempt.score) || 0), 0) / examHistory.length
      : 0;

    return { totalAttempts, completedExams, averageScore };
  };

  const getAttemptStatus = (attempt) => {
    if (attempt.is_completed && attempt.end_time) {
      return 'completed';
    } else if (attempt.is_completed && !attempt.end_time) {
      return 'auto_submitted';
    } else {
      return 'in_progress';
    }
  };

  const formatAttemptStatus = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'auto_submitted':
        return 'Auto Submitted';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Unknown';
    }
  };

  const calculateTimeTaken = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMinutes = Math.floor((end - start) / (1000 * 60));
    
    return formatDuration(diffInMinutes);
  };

  const stats = getUserStats();

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Student Dashboard</h1>
            <p>Welcome back, {user?.first_name || user?.last_name || 'Student'}!</p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user?.first_name || user?.last_name}</span>
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="logout-button"
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Attempts</h3>
          <p className="stat-number">{stats.totalAttempts}</p>
        </div>
        <div className="stat-card">
          <h3>Completed Exams</h3>
          <p className="stat-number">{stats.completedExams}</p>
        </div>
        <div className="stat-card">
          <h3>Average Score</h3>
          <p className={`stat-number ${getScoreColor(stats.averageScore)}`}>
            {stats.averageScore.toFixed(1)}%
          </p>
        </div>
        <div className="stat-card">
          <h3>Available Exams</h3>
          <p className="stat-number">{availableExams.length}</p>
        </div>
      </div>

      {/* Available Exams Section */}
      <section className="exams-section">
        <div className="section-header">
          <h2>Available Exams</h2>
          <div className="search-container">
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="no-exams">
            <p>{searchTerm ? 'No exams match your search.' : 'No exams available at the moment.'}</p>
          </div>
        ) : (
          <div className="exams-grid">
            {filteredExams.map(exam => {
              // Check if user has attempted this exam
              const hasAttempted = examHistory.some(attempt => attempt.exam === exam.id);
              const hasCompleted = examHistory.some(attempt => 
                attempt.exam === exam.id && attempt.is_completed
              );
              
              return (
                <div key={exam.id} className="exam-card">
                  <div className="exam-header">
                    <h3>{exam.title}</h3>
                    <span className={`exam-status ${exam.is_active ? 'active' : 'inactive'}`}>
                      {exam.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="exam-details">
                    <p className="exam-description">{exam.description || 'No description available'}</p>
                    
                    <div className="exam-info">
                      <div className="info-item">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">{formatDuration(exam.duration_minutes)}</span>
                      </div>
                      
                      {exam.total_questions_to_ask && (
                        <div className="info-item">
                          <span className="info-label">Questions:</span>
                          <span className="info-value">{exam.total_questions_to_ask}</span>
                        </div>
                      )}
                      
                      <div className="info-item">
                        <span className="info-label">Passing Score:</span>
                        <span className="info-value">{exam.pass_mark || exam.passing_score || 70}%</span>
                      </div>
                      
                      {exam.student_class && (
                        <div className="info-item">
                          <span className="info-label">Class:</span>
                          <span className="info-value">{exam.student_class}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="exam-actions">
                    <button
                      onClick={() => handleStartExam(exam.id)}
                      className="start-exam-button"
                      disabled={!exam.is_active || hasCompleted}
                    >
                      {!exam.is_active
                        ? 'Not Available'
                        : hasCompleted
                          ? 'Exam Completed'
                          : hasAttempted
                            ? 'Continue Exam'
                            : 'Start Exam'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Exam History Section */}
      <section className="history-section">
        <h2>Exam History</h2>
        
        {examHistory.length === 0 ? (
          <div className="no-history">
            <p>No exam history available.</p>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Date Started</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {examHistory.map(attempt => {
                  const status = getAttemptStatus(attempt);
                  return (
                    <tr key={attempt.id}>
                      <td className="exam-title">
                        {attempt.exam_title || `Exam ID: ${attempt.exam}`}
                      </td>
                      <td>{formatDate(attempt.start_time)}</td>
                      <td className={getScoreColor(parseFloat(attempt.score) || 0)}>
                        {attempt.score ? `${parseFloat(attempt.score).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td>
                        <span className={`status-badge ${status}`}>
                          {formatAttemptStatus(status)}
                        </span>
                      </td>
                      <td>
                        {calculateTimeTaken(attempt.start_time, attempt.end_time)}
                      </td>
                      <td>
                        {attempt.is_completed && (
                          <button
                            onClick={() => handleViewResults(attempt.id)}
                            className="view-results-button"
                          >
                            View Results
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="cancel-button"
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="confirm-button logout-confirm"
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
