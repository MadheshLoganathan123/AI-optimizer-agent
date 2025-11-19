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

// Export API keys
window.API_CONFIG = {
    OPENCAGE_API_KEY: getApiKey(),
    OPENTRIPMAP_API_KEY: localStorage.getItem('OPENTRIPMAP_API_KEY') || 'YOUR_KEY'
};

