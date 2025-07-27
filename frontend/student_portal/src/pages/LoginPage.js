// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Container, TextField, Button, Typography, Box, Alert, CircularProgress
} from '@mui/material';

const LoginPage = () => {
    const [email, setEmail] = useState(''); // Changed from 'username' to 'email'
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password); // Changed 'username' to 'email' here
            navigate('/dashboard');
        } catch (err) {
            // Adjust error message handling for email if needed
            const errorMessage = err.response?.data?.email?.[0] || err.response?.data?.non_field_errors?.[0] || 'Login failed. Please check your credentials.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Sign in
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email" // Changed from 'username' to 'email'
                        label="Email Address" // Changed label
                        name="email" // Changed from 'username' to 'email'
                        autoComplete="email" // Changed autocomplete
                        autoFocus
                        value={email} // Binds to email state
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                    </Button>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate('/register')}
                    >
                        Don't have an account? Sign Up
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default LoginPage;

