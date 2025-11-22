const express = require("express");
const router = express.Router();
const { request } = require("../utils/axiosWrapper");

// GET /api/attractions?lat=...&lon=...
router.get("/", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        error: "lat and lon query parameters are required"
      });
    }

    // Validate coordinate values
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: "lat and lon must be valid numbers"
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: "Invalid coordinate range"
      });
    }

    // Check if SERPAPI_KEY is configured
    const serpApiKey = process.env.SERPAPI_KEY;

    // Log key status (do not log the full key for security)
    console.log(`[ATTRACTIONS] Checking SERPAPI_KEY... Loaded: ${!!serpApiKey}, Length: ${serpApiKey ? serpApiKey.length : 0}`);

    if (!serpApiKey || serpApiKey === 'MY_SERPAPI_KEY_HERE') {
      console.error('[ATTRACTIONS] SERPAPI_KEY is missing or default');
      return res.status(500).json({
        error: "SERPAPI_KEY not configured in backend .env file"
      });
    }

    // Build SerpAPI query for local results
    // Using "google_maps" engine for coordinate-based search
    const serpApiUrl = `https://serpapi.com/search.json`;

    const params = {
      engine: 'google_maps',
      q: 'tourist attractions',
      ll: `@${latitude},${longitude},14z`,
      api_key: serpApiKey,
      type: 'search',
      num: 10 // Limit to 10 results
    };

    console.log(`[ATTRACTIONS] Fetching attractions for coordinates: ${latitude}, ${longitude}`);

    // Make request to SerpAPI
    const response = await request({
      method: 'GET',
      url: serpApiUrl,
      params: params
    });

    // Parse SerpAPI response
    const data = response.data;

    // Extract local results or places
    let attractions = [];

    // Try to get local_results first (for "near me" searches)
    if (data.local_results && Array.isArray(data.local_results)) {
      attractions = data.local_results.map(item => ({
        name: item.title || item.name || 'Unknown',
        address: item.address || item.address_lines?.join(', ') || 'Address not available',
        rating: item.rating || null,
        reviews: item.reviews || null,
        coordinates: item.gps_coordinates ? {
          lat: item.gps_coordinates.latitude,
          lon: item.gps_coordinates.longitude
        } : null,
        photos: item.thumbnail ? [item.thumbnail] : []
      }));
    }
    // Fallback to organic results if local_results not available
    else if (data.organic_results && Array.isArray(data.organic_results)) {
      attractions = data.organic_results
        .filter(item => item.title) // Only include items with titles
        .slice(0, 10) // Limit to 10
        .map(item => ({
          name: item.title || 'Unknown',
          address: item.address || item.snippet || 'Address not available',
          rating: item.rating || null,
          reviews: item.reviews || null,
          coordinates: null, // Organic results may not have coordinates
          photos: item.thumbnail ? [item.thumbnail] : []
        }));
    }
    // Try places_results as another fallback
    else if (data.places_results && Array.isArray(data.places_results)) {
      attractions = data.places_results.map(item => ({
        name: item.title || item.name || 'Unknown',
        address: item.address || 'Address not available',
        rating: item.rating || null,
        reviews: item.reviews || null,
        coordinates: item.gps_coordinates ? {
          lat: item.gps_coordinates.latitude,
          lon: item.gps_coordinates.longitude
        } : null,
        photos: item.thumbnail ? [item.thumbnail] : []
      }));
    }

    // If no attractions found, return empty array
    if (attractions.length === 0) {
      console.log(`[ATTRACTIONS] No attractions found for coordinates: ${latitude}, ${longitude}`);
      return res.json({
        status: 'ok',
        attractions: [],
        message: 'No attractions found for this location'
      });
    }

    console.log(`[ATTRACTIONS] Found ${attractions.length} attractions`);

    res.json({
      status: 'ok',
      attractions: attractions,
      count: attractions.length
    });

  } catch (err) {
    console.error("[ATTRACTIONS] Error:", err.message);
    console.error("[ATTRACTIONS] Error details:", err.response?.data || err.stack);

    // Provide helpful error messages
    if (err.response?.status === 401 || err.response?.status === 403) {
      return res.status(500).json({
        error: "SERPAPI authentication failed. Check your API key."
      });
    }

    if (err.response?.status === 429) {
      return res.status(500).json({
        error: "SERPAPI rate limit exceeded. Please try again later."
      });
    }

    res.status(500).json({
      error: "Failed to fetch attractions",
      details: err.message,
      apiError: err.response?.data
    });
  }
});

module.exports = router;
