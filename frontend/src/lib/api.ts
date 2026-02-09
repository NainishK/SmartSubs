import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    timeout: 120000, // 2 minutes (Handle Free Tier Cold Starts)
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log auth errors for debugging
        if (error.response && error.response.status === 401) {
            console.warn('Auth error on:', error.config.url, 'Silent:', !!error.config?._silentAuth);
        }

        // Check for silent flag. If true, we don't redirect to login.
        // @ts-ignore
        const isSilent = error.config?._silentAuth;

        if (error.response && error.response.status === 401 && !isSilent) {
            localStorage.removeItem('token');
            // Avoid redirecting if we're already on login/signup
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;