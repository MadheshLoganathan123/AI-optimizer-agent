// Frontend API Configuration
// For security, this file should be in .gitignore if it contains real keys
// In production, load keys from environment variables or a secure backend endpoint

// Get API key from environment variable or use placeholder
// For browser-based apps, you can set this via a build process or load from backend
const getApiKey = () => {
    // Try to get from window (if set via script tag or backend)
    if (window.OPENCAGE_API_KEY) {
        return window.OPENCAGE_API_KEY;
    }
    // Try to get from localStorage (set via UI)
    const storedKey = localStorage.getItem('OPENCAGE_API_KEY');
    if (storedKey && storedKey !== 'YOUR_KEY' && storedKey.trim() !== '') {
        return storedKey;
    }
    // Default placeholder - user needs to set this
    return 'YOUR_KEY';
};

// Backend URL - adjust if your backend runs on a different port
const getBackendUrl = () => {
    // Try to get from window (if set via script tag)
    if (window.BACKEND_URL) {
        return window.BACKEND_URL;
    }
    // Default to localhost:5000 (common backend port)
    return 'http://localhost:5000';
};

// Export API keys
window.API_CONFIG = {
    OPENCAGE_API_KEY: getApiKey() !== 'YOUR_KEY' ? getApiKey() : 'e6c88f834e984192afc0bdd2561e29d2',
    OPENTRIPMAP_API_KEY: localStorage.getItem('OPENTRIPMAP_API_KEY') || '5ae2e3f221c38a28845f05b67cd27b2e6b81540ed9d5732bf1d042f9',
    BACKEND_URL: getBackendUrl()
};

