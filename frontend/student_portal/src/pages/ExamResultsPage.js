// src/pages/ExamResultsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { examAPI } from '../config/api';
import examService from '../services/examService';
import '../styles/ExamResultsPage.css';

const ExamResultsPage = () => {
  const { pk } = useParams(); // Changed from attemptId to pk to match App.js routing
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchExamResult();
  }, [pk]);

  const fetchExamResult = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use examService to match your backend API structure
      const resultData = await examService.getExamResults(pk);
      setResult(resultData);
    } catch (err) {
      console.error('Fetch result error:', err);
      
      // Handle different error scenarios
      if (err.response?.status === 404) {
        setError('Exam result not found.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this result.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to load exam results. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMinutes = Math.floor((end - start) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes`;
    }
    
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getPassingScore = ()=> {
    return result?.exam?.pass_mark ||
           result?.exam.passing_score ||
           result?.pass_mark ||
           result?.passing_score ||
           50;
  }
  const getScoreColor = (percentage, passingScore) => {
    if (percentage >= passingScore) return 'success';
    if (percentage >= passingScore * 0.7) return 'warning';
    return 'danger';
  };

  const getGradeLabel = (percentage, passingScore) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= passingScore) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const calculateStats = () => {
    if (!result?.student_answers) return null;
    
    const answers = result.student_answers;
    const questionTypes = {};
    
    // Filter out summary records for MS questions (those without chosen_choice but have answer_text with commas)
    const mainAnswers = answers.filter(answer => {
      if (answer.question?.question_type === 'MS') {
        // Keep only the summary record (the one without chosen_choice)
        return !answer.chosen_choice;
      }
      return true;
    });
    
    mainAnswers.forEach(answer => {
      const type = answer.question?.question_type || 'Unknown';
      if (!questionTypes[type]) {
        questionTypes[type] = { correct: 0, total: 0 };
      }
      questionTypes[type].total++;
      if (answer.is_correct) {
        questionTypes[type].correct++;
      }
    });

    return questionTypes;
  };

  const getMainAnswers = () => {
    if (!result?.student_answers) return [];
    
    // Filter to get main answers (excluding individual MS choice records)
    return result.student_answers.filter(answer => {
      if (answer.question?.question_type === 'MS') {
        // For MS questions, keep only the summary record
        return !answer.chosen_choice;
      }
      return true;
    });
  };

  const filterAnswers = (answers) => {
    if (selectedCategory === 'all') return answers;
    if (selectedCategory === 'correct') return answers.filter(a => a.is_correct);
    if (selectedCategory === 'incorrect') return answers.filter(a => !a.is_correct);
    return answers.filter(a => a.question?.question_type === selectedCategory);
  };

  const getQuestionTypeLabel = (type) => {
    const labels = {
      'MC': 'Multiple Choice',
      'TF': 'True/False',
      'FB': 'Fill in the Blank',
      'MS': 'Multiple Select'
    };
    return labels[type] || type;
  };

  const getCorrectAnswerDisplay = (question) => {
    if (!question?.choices) return 'N/A';
    
    const correctChoices = question.choices.filter(c => c.is_correct);
    return correctChoices.map(c => c.choice_text).join(', ') || 'N/A';
  };

  const getStudentAnswerDisplay = (answer) => {
    if (answer.question?.question_type === 'MS') {
      // For multiple select, parse the answer_text to show selected choices
      if (answer.answer_text) {
        const selectedIds = answer.answer_text.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        const selectedChoices = answer.question.choices
          ?.filter(choice => selectedIds.includes(choice.id))
          .map(choice => choice.choice_text) || [];
        return selectedChoices.join(', ') || 'No selections';
      }
      return 'No selections';
    }
    
    return answer.answer_text || answer.chosen_choice?.choice_text || 'No answer provided';
  };

  if (loading) {
    return (
      <div className="result-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading exam results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-container">
        <div className="error-message">
          <h3>Error Loading Results</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-container">
        <div className="error-message">
          <h3>No Results Found</h3>
          <p>Unable to load exam results.</p>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const scorePercentage = result?.percentage_score || 0;
  const passingScore = getPassingScore();
  const isPassed = scorePercentage >= passingScore;
  const stats = calculateStats();
  const correctAnswers = result.correct_answers || 0;
  const totalQuestions = result.total_questions || getMainAnswers().length || 0;
  const mainAnswers = getMainAnswers();

  return (
    <div className="result-container">
      {/* Header */}
      <header className="result-header">
        <div className="header-content">
          <button onClick={() => navigate('/dashboard')} className="back-link">
            ← Back to Dashboard
          </button>
          <h1>Exam Results</h1>
        </div>
      </header>

      {/* Score Overview */}
      <section className="score-overview">
        <div className="score-card">
          <div className={`score-display ${getScoreColor(scorePercentage, passingScore)}`}>
            <div className="score-number">{scorePercentage}%</div>
            <div className="score-grade">{getGradeLabel(scorePercentage, passingScore)}</div>
          </div>
          
          <div className="score-details">
            <h2>{result.exam?.title || 'Exam'}</h2>
            <div className={`pass-status ${isPassed ? 'passed' : 'failed'}`}>
              {isPassed ? '✅ PASSED' : '❌ FAILED'}
            </div>
            <div className="score-breakdown">
              <span>{correctAnswers} out of {totalQuestions} questions correct</span>
              <span>Score: {parseFloat(result.score || 0).toFixed(1)} points</span>
              <span>Passing score: {passingScore}%</span>
            </div>
          </div>
        </div>

        {/* Exam Info */}
        <div className="exam-info-grid">
          <div className="info-item">
            <span className="info-label">Started:</span>
            <span className="info-value">{formatDate(result.start_time)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Completed:</span>
            <span className="info-value">
              {result.end_time ? formatDate(result.end_time) : 'Not completed'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Duration:</span>
            <span className="info-value">
              {formatDuration(result.start_time, result.end_time)}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value">
              {result.is_completed ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>
      </section>

      {/* Performance Stats */}
      {stats && Object.keys(stats).length > 0 && (
        <section className="performance-stats">
          <h3>Performance by Question Type</h3>
          <div className="stats-grid">
            {Object.entries(stats).map(([type, data]) => (
              <div key={type} className="stat-card">
                <h4>{getQuestionTypeLabel(type)}</h4>
                <div className="stat-numbers">
                  <span className="stat-score">
                    {data.correct}/{data.total}
                  </span>
                  <span className="stat-percentage">
                    ({data.total > 0 ? ((data.correct / data.total) * 100).toFixed(1) : '0'}%)
                  </span>
                </div>
                <div className="stat-bar">
                  <div 
                    className="stat-fill" 
                    style={{ width: `${data.total > 0 ? (data.correct / data.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detailed Review */}
      {mainAnswers && mainAnswers.length > 0 && (
        <section className="detailed-review">
          <div className="review-header">
            <h3>Detailed Review</h3>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="toggle-details-button"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showDetails && (
            <div className="review-content">
              {/* Filter Options */}
              <div className="filter-options">
                <label>Filter by:</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Questions</option>
                  <option value="correct">Correct Answers</option>
                  <option value="incorrect">Incorrect Answers</option>
                  <option value="MC">Multiple Choice</option>
                  <option value="TF">True/False</option>
                  <option value="FB">Fill in the Blank</option>
                  <option value="MS">Multiple Select</option>
                </select>
              </div>

              {/* Questions Review */}
              <div className="questions-review">
                {filterAnswers(mainAnswers).map((answer, index) => (
                  <div key={answer.id || index} className={`question-review ${answer.is_correct ? 'correct' : 'incorrect'}`}>
                    <div className="question-header">
                      <span className="question-number">Question {index + 1}</span>
                      <span className="question-type">{getQuestionTypeLabel(answer.question?.question_type)}</span>
                      <span className={`result-badge ${answer.is_correct ? 'correct' : 'incorrect'}`}>
                        {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                      <span className="points">
                        {parseFloat(answer.score || 0).toFixed(1)} / {parseFloat(answer.question?.score_points || 0).toFixed(1)} pts
                      </span>
                    </div>

                    <div className="question-content">
                      <p className="question-text">{answer.question?.question_text}</p>
                      
                      <div className="answer-section">
                        <div className="your-answer">
                          <strong>Your Answer:</strong>
                          <span className={answer.is_correct ? 'correct-answer' : 'wrong-answer'}>
                            {getStudentAnswerDisplay(answer)}
                          </span>
                        </div>

                        {!answer.is_correct && answer.question?.question_type !== 'FB' && (
                          <div className="correct-answer">
                            <strong>Correct Answer:</strong>
                            <span className="correct-answer">
                              {getCorrectAnswerDisplay(answer.question)}
                            </span>
                          </div>
                        )}

                        {answer.question?.question_type === 'FB' && answer.question?.correct_answer && (
                          <div className="correct-answer">
                            <strong>Expected Answer:</strong>
                            <span className="correct-answer">{answer.question.correct_answer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filterAnswers(mainAnswers).length === 0 && (
                <div className="no-results">
                  <p>No questions match the selected filter.</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Actions */}
      <section className="result-actions">
        <div className="action-buttons">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="primary-button"
          >
            Back to Dashboard
          </button>
          
          <button 
            onClick={() => window.print()} 
            className="secondary-button"
          >
            Print Results
          </button>
          
          {!isPassed && result.exam?.is_active && (
            <button 
              onClick={() => navigate(`/exam/${result.exam.id}`)} 
              className="retry-button"
            >
              Retake Exam
            </button>
          )}
        </div>
      </section>

      {/* Success/Failure Message */}
      <section className={`result-message ${isPassed ? 'success' : 'failure'}`}>
        <div className="message-content">
          {isPassed ? (
            <>
              <h3>🎉 Congratulations!</h3>
              <p>You have successfully passed this exam with a score of {scorePercentage}%.</p>
              {scorePercentage >= 90 && <p>Excellent work! You've achieved an outstanding score.</p>}
            </>
          ) : (
            <>
              <h3>📚 Keep Studying!</h3>
              <p>You scored {scorePercentage}%, which is below the passing score of {passingScore}%.</p>
              <p>Review the questions above and try again when you're ready.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default ExamResultsPage;
