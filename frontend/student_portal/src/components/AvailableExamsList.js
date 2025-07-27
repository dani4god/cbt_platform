// src/components/AvailableExamsList.js
import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Button, Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import examService from '../services/examService'; // Import examService

const AvailableExamsList = ({ exams, onExamStartSuccess }) => {
    const navigate = useNavigate();

    const handleStartExam = async (examId) => {
        try {
            const response = await examService.startExam(examId);
            const attemptId = response.attempt_id;
            onExamStartSuccess(attemptId); // Callback to parent
            navigate(`/exam/${attemptId}`); // Navigate to exam taking page with attemptId
        } catch (error) {
            // Display user-friendly error
            alert('Failed to start exam: ' + (error.response?.data?.detail || error.message));
        }
    };

    if (!exams || exams.length === 0) {
        return <Typography variant="body1">No exams currently available.</Typography>;
    }

    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="available exams table">
                <TableHead>
                    <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell align="right">Duration (mins)</TableCell>
                        <TableCell align="right">Questions</TableCell>
                        <TableCell align="center">Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {exams.map((exam) => (
                        <TableRow
                            key={exam.id}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell component="th" scope="row">
                                <Typography variant="subtitle1">{exam.title}</Typography>
                                <Typography variant="body2" color="text.secondary">{exam.description}</Typography>
                            </TableCell>
                            <TableCell align="right">{exam.duration_minutes}</TableCell>
                            <TableCell align="right">{exam.question_count}</TableCell>
                            <TableCell align="center">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleStartExam(exam.id)}
                                >
                                    Start Exam
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AvailableExamsList;

