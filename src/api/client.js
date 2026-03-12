import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Use environment variable for API URL with a fallback for local dev
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';

const client = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercept requests to add token and device info
client.interceptors.request.use(async (config) => {
    try {
        const token = await SecureStore.getItemAsync('userToken');
        const deviceId = await SecureStore.getItemAsync('deviceId');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (deviceId) {
            config.headers['X-Device-Id'] = deviceId;
        }

        // Initialize retry count for the request
        config._retryCount = config._retryCount || 0;
    } catch (e) {
        console.error('Request interceptor error', e);
    }
    return config;
});

// Intercept responses for global error handling and retries
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

        // Retry logic for network errors or server issues (5xx)
        // Limit to 3 retries
        const MAX_RETRIES = 3;

        if (config && config._retryCount < MAX_RETRIES) {
            const isNetworkError = !response;
            const isServerError = response && response.status >= 500;

            if (isNetworkError || isServerError) {
                config._retryCount += 1;
                const delay = Math.pow(2, config._retryCount) * 1000; // Exponential backoff

                console.warn(`Retry attempt ${config._retryCount}/${MAX_RETRIES} for ${config.url} after ${delay}ms`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return client(config);
            }
        }

        return Promise.reject(error);
    }
);

export default client;
export { API_BASE };
