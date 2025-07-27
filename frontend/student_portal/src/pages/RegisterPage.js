// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Container, TextField, Button, Typography, Box, Alert, CircularProgress
} from '@mui/material';

const RegisterPage = () => {
    const [first_name, setFirstName] = useState('');
    const [last_name, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password_confirm, setpassword_confirm] = useState(''); // For password confirmation
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== password_confirm) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            await register(first_name, last_name, username, email, password, password_confirm);
            alert('Registration successful! Please login.'); // Simple success message
            navigate('/login'); // Redirect to login page after successful registration
        } catch (err) {
            // dj-rest-auth registration errors might be nested, e.g., err.response.data.username[0]
            const errorMessage = err.response?.data?.email?.[0] || 
                                err.response?.data?.username?.[0] || 
                                err.response?.data?.first_name?.[0] ||
                                err.response?.data?.last_name?.[0] ||
                                err.response?.data?.non_field_errors?.[0] || 
                                'Registration failed.';
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
                    Register
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="first_name"
                        label="First Name"
                        name="first_name"
                        autoComplete="given-name"
                        autoFocus
                        value={first_name}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="last_name"
                        label="Last Name"
                        name="last_name"
                        autoComplete="family-name"
                        value={last_name}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Username"
                        name="username"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        value={email}
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
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password_confirm"
                        label="Confirm Password"
                        type="password"
                        id="password_confirm"
                        autoComplete="new-password"
                        value={password_confirm}
                        onChange={(e) => setpassword_confirm(e.target.value)}
                    />
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
                    </Button>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate('/login')}
                    >
                        Already have an account? Sign In
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default RegisterPage;
