// API utilities for ngrok browser warning bypass
const API_BASE_URL = window.location.origin;

// Custom fetch function with ngrok headers
async function apiFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const defaultHeaders = {
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'my-custom-agent',
    'Content-Type': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Helper functions for common HTTP methods
const api = {
  get: (url, options = {}) => apiFetch(url, { ...options, method: 'GET' }),
  
  post: (url, data, options = {}) => apiFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  put: (url, data, options = {}) => apiFetch(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (url, options = {}) => apiFetch(url, { ...options, method: 'DELETE' }),
  
  patch: (url, data, options = {}) => apiFetch(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  })
};

// Export for use in other files
window.apiFetch = apiFetch;
window.api = api;
