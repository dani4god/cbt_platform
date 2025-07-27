// src/index.js (or main.jsx)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Your global CSS
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { ThemeProvider, createTheme } from '@mui/material/styles'; // Import MUI ThemeProvider

// Define a basic MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue
    },
    secondary: {
      main: '#dc004e', // Pink
    },
  },
  typography: {
    h4: {
      fontSize: '1.5rem',
      '@media (min-width:600px)': {
        fontSize: '2.125rem',
      },
    },
    body1: {
      fontSize: '0.875rem',
      '@media (min-width:600px)': {
        fontSize: '1rem',
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}> {/* Wrap with ThemeProvider */}
      <AuthProvider> {/* Wrap with AuthProvider */}
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

