// API configuration utility
// This helps ensure consistent API URL usage throughout the application

// Get the API base URL from environment variable or use localhost as fallback
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Helper function to construct full API URLs
export const getApiUrl = (endpoint: string): string => {
  // Make sure endpoint doesn't start with a slash when we append it
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Log the configured API URL during app initialization
console.log('API is configured to use:', API_BASE_URL);
