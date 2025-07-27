// src/pages/ExamPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { examAPI } from '../config/api';
import '../styles/ExamPage.css';

const ExamPage = () => {
  const { examId } = useParams(); // Remove attemptId since it's not in your routes
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Exam and attempt data
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  
  // Refs for cleanup
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const isSubmittedRef = useRef(false);
  const timeWarningShownRef = useRef(false);

  // Initialize exam and start attempt
  useEffect(() => {
    initializeExam();
    return () => {
      // Cleanup timers
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [examId]);

  const initializeExam = async () => {
    try {
      setLoading(true);
      setError(null);

      // Start the exam attempt - this matches your backend endpoint
      const attemptResponse = await examAPI.startExam(examId);
      
      // Handle different response scenarios from backend
      if (attemptResponse.detail) {
        if (attemptResponse.detail.includes('Time limit exceeded')) {
          // Exam was auto-submitted due to timeout
          navigate(`/exam-results/${attemptResponse.id}`);
          return;
        }
        
        if (attemptResponse.detail.includes('already completed')) {
          setError('You have already completed this exam.');
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }
        
        if (attemptResponse.detail.includes('not currently active')) {
          setError('This exam is not currently active.');
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }
      }

      const attemptData = attemptResponse;
      setAttempt(attemptData);
      setExam(attemptData.exam);

      // Fetch questions for this attempt
      const questionsResponse = await examAPI.getExamQuestions(examId);
      setQuestions(questionsResponse || []);

      // Calculate time remaining based on backend logic
      calculateTimeRemaining(attemptData);

      // Load any existing answers (initialize empty for now)
      initializeAnswers(questionsResponse || []);

    } catch (err) {
      console.error('Initialize exam error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to load exam. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (attemptData) => {
    // Parse the start_time from backend (ISO string)
    const startTime = new Date(attemptData.start_time);
    const now = new Date();
    
    // Calculate elapsed time in minutes (matching backend logic)
    const elapsedMinutes = (now - startTime) / (1000 * 60);
    const totalDurationMinutes = attemptData.exam_duration || 60;
    
    // Calculate remaining time in seconds
    const remainingMinutes = Math.max(0, totalDurationMinutes - elapsedMinutes);
    const remainingSeconds = Math.floor(remainingMinutes * 60);
    
    setTimeRemaining(remainingSeconds);
    
    // Start timer if there's time remaining
    if (remainingSeconds > 0 && attempt?.id) {
      startTimer();
    } else if (attempt?.id) {
      // Time already expired
      handleTimeUp();
    }
  };

  const initializeAnswers = (questionsData) => {
    const initialAnswers = {};
    questionsData.forEach(question => {
      if (question.question_type === 'MS') {
        initialAnswers[question.id] = [];
      } else {
        initialAnswers[question.id] = '';
      }
    });
    setAnswers(initialAnswers);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          handleTimeUp();
          return 0;
        }
        
        // Show warning at 5 minutes (300 seconds) - only once
        if (newTime <= 300 && newTime > 299 && !timeWarningShownRef.current) {
          timeWarningShownRef.current = true;
          setShowTimeWarning(true);
        }
        
        return newTime;
      });
    }, 1000);
  };

  const handleTimeUp = useCallback(async () => {
    if (isSubmittedRef.current) return;
    
    console.log('Time up - auto-submitting exam');
    isSubmittedRef.current = true;
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    try {
      // Auto-submit the exam using your backend endpoint
      const response = await examAPI.submitExam(attempt.id);
      
      // Navigate to results page
      navigate(`/exam-results/${attempt.id}`);
    } catch (err) {
      console.error('Auto-submit error:', err);
      if (err.response?.data?.detail?.includes('already completed')) {
        navigate(`/exam-results/${attempt.id}`);
      } else {
        setError('Exam time expired. There was an error submitting your exam.');
      }
      
    }
  }, [attempt?.id, navigate]);

  useEffect(() => {
    if (attempt && exam) {
      calculateTimeRemaining(attempt);
    }
  }, [attempt, exam]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Auto-save after a delay
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveAnswer(questionId, value);
    }, 1500); // Increased delay to reduce server load
  };

  const saveAnswer = async (questionId, value) => {
    if (!attempt || isSubmittedRef.current) return;

    try {
      setAutoSaving(true);
      
      const question = questions.find(q => q.id === questionId);
      if (!question) return;

      let payload = {
        question_id: questionId,
      };

      // Handle different question types according to your backend logic
      if (question.question_type === 'FB') {
        payload.answer_text = value || '';
      } else if (question.question_type === 'MS') {
        // For multiple select, send as comma-separated string
        const answerText = Array.isArray(value) ? value.join(',') : String(value || '');
        payload.answer_text = answerText;
      } else {
        // For MC and TF, send chosen_choice_id
        payload.chosen_choice_id = value || null;
      }

      // Use the correct API endpoint
      await examAPI.submitAnswer(attempt.id, questionId, payload.chosen_choice_id, payload.answer_text);
      
    } catch (err) {
      console.error('Save answer error:', err);
      
      // Check if the error is due to time expiration
      if (err.response?.data?.detail?.includes('Time limit exceeded')) {
        handleTimeUp();
      }
      // Don't show error to user for auto-save failures unless it's critical
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSubmitExam = async () => {
    if (isSubmittedRef.current) return;
    
    try {
      setSubmitting(true);
      isSubmittedRef.current = true;
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const response = await examAPI.submitExam(attempt.id);
      navigate(`/exam-results/${attempt.id}`);
    } catch (err) {
      console.error('Submit exam error:', err);
      setError('Failed to submit exam. Please try again.');
      isSubmittedRef.current = false;
      // Restart timer if submission failed
      if (timeRemaining > 0) {
        startTimer();
      }
    } finally {
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionProgress = () => {
    const answered = Object.values(answers).filter(answer => {
      if (Array.isArray(answer)) return answer.length > 0;
      return answer !== '' && answer !== null && answer !== undefined;
    }).length;
    return { answered, total: questions.length };
  };

  // Prevent page refresh/close without warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmittedRef.current && attempt) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attempt]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = getQuestionProgress();
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  if (loading) {
    return (
      <div className="exam-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="exam-container">
        <div className="error-message">
          <h3>No Questions Available</h3>
          <p>This exam has no questions assigned.</p>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-container">
      {/* Header */}
      <header className="exam-header">
        <div className="exam-info">
          <h1>{exam?.title || 'Exam'}</h1>
          <div className="exam-meta">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>•</span>
            <span>{progress.answered} answered</span>
          </div>
        </div>
        
        <div className="exam-controls">
          <div className={`timer ${timeRemaining <= 300 ? 'warning' : ''} ${timeRemaining <= 60 ? 'critical' : ''}`}>
            <span>⏱ {formatTime(timeRemaining)}</span>
          </div>
          {autoSaving && <span className="auto-save">Saving...</span>}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="progress-text">
          {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
        </span>
      </div>

      {/* Question Content */}
      <main className="question-content">
        <div className="question-container">
          <div className="question-header">
            <h2>Question {currentQuestionIndex + 1}</h2>
            <span className="question-points">{currentQuestion.score_points} points</span>
          </div>
          
          <div className="question-text">
            {currentQuestion.question_text}
          </div>

          <div className="answer-section">
            {currentQuestion.question_type === 'MC' && (
              <div className="multiple-choice">
                {currentQuestion.choices?.map(choice => (
                  <label key={choice.id} className="choice-option">
                    <input
                      type="radio"
                      name={`question_${currentQuestion.id}`}
                      value={choice.id}
                      checked={answers[currentQuestion.id] == choice.id}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, parseInt(e.target.value))}
                    />
                    <span className="choice-text">{choice.choice_text}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'TF' && (
              <div className="true-false">
                {currentQuestion.choices?.map(choice => (
                  <label key={choice.id} className="choice-option">
                    <input
                      type="radio"
                      name={`question_${currentQuestion.id}`}
                      value={choice.id}
                      checked={answers[currentQuestion.id] == choice.id}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, parseInt(e.target.value))}
                    />
                    <span className="choice-text">{choice.choice_text}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'MS' && (
              <div className="multiple-select">
                <p className="instruction">Select all that apply:</p>
                {currentQuestion.choices?.map(choice => (
                  <label key={choice.id} className="choice-option">
                    <input
                      type="checkbox"
                      value={choice.id}
                      checked={(answers[currentQuestion.id] || []).includes(choice.id)}
                      onChange={(e) => {
                        const currentAnswers = answers[currentQuestion.id] || [];
                        const choiceId = parseInt(e.target.value);
                        let newAnswers;
                        
                        if (e.target.checked) {
                          newAnswers = [...currentAnswers, choiceId];
                        } else {
                          newAnswers = currentAnswers.filter(id => id !== choiceId);
                        }
                        
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                    />
                    <span className="choice-text">{choice.choice_text}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'FB' && (
              <div className="fill-blank">
                <textarea
                  className="answer-input"
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Navigation */}
      <nav className="question-navigation">
        <div className="nav-buttons">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={isFirstQuestion}
            className="nav-button prev-button"
          >
            ← Previous
          </button>
          
          <div className="question-indicators">
            {questions.map((_, index) => {
              const questionId = questions[index]?.id;
              const isAnswered = answers[questionId] && (
                Array.isArray(answers[questionId]) 
                  ? answers[questionId].length > 0 
                  : answers[questionId] !== ''
              );
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`question-indicator ${
                    index === currentQuestionIndex ? 'current' : ''
                  } ${isAnswered ? 'answered' : ''}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          {isLastQuestion ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="nav-button submit-button"
              disabled={submitting || isSubmittedRef.current}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="nav-button next-button"
            >
              Next →
            </button>
          )}
        </div>
      </nav>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Submit Exam</h3>
            <p>
              You have answered {progress.answered} out of {progress.total} questions.
              <br />
              Time remaining: {formatTime(timeRemaining)}
              <br />
              Are you sure you want to submit your exam?
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="cancel-button"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExam}
                className="confirm-button submit-confirm"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Warning Modal */}
      {showTimeWarning && (
        <div className="modal-overlay">
          <div className="modal-content warning">
            <h3>⚠️ Time Warning</h3>
            <p>You have less than 5 minutes remaining!</p>
            <button
              onClick={() => setShowTimeWarning(false)}
              className="confirm-button"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPage;
