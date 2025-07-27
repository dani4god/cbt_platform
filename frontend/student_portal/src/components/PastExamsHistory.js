// src/components/PastExamsHistory.js
import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Button, Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PastExamsHistory = ({ attempts }) => {
    const navigate = useNavigate();

    const handleReviewExam = (attemptId) => {
        navigate(`/results/${attemptId}`); // Navigate to exam results page
    };

    if (!attempts || attempts.length === 0) {
        return <Typography variant="body1">No past exam attempts found.</Typography>;
    }

    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="past exams history table">
                <TableHead>
                    <TableRow>
                        <TableCell>Exam Title</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell align="right">Date Taken</TableCell>
                        <TableCell align="center">Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {attempts.map((attempt) => (
                        <TableRow
                            key={attempt.id}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell component="th" scope="row">
                                {/* `exam` is nested from ExamAttemptResultSerializer */}
                                {attempt.exam ? attempt.exam.title : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                                {attempt.score !== null ? `${attempt.score}%` : 'N/A'}
                                {/* You might want to calculate total possible score from nested questions to show e.g. 80/100 */}
                            </TableCell>
                            <TableCell align="right">
                                {new Date(attempt.end_time).toLocaleString()}
                            </TableCell>
                            <TableCell align="center">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleReviewExam(attempt.id)}
                                >
                                    Review
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default PastExamsHistory;

