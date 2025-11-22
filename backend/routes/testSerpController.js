const express = require("express");
const router = express.Router();
const { request } = require("../utils/axiosWrapper");

// GET /api/test-serp - Test SerpAPI connection
router.get("/", async (req, res) => {
  try {
    const serpApiKey = process.env.SERPAPI_KEY;
    
    if (!serpApiKey || serpApiKey === 'MY_SERPAPI_KEY_HERE') {
      console.log("SERPAPI FAILED - API key not configured");
      return res.status(500).json({ 
        status: "FAILED",
        message: "SERPAPI_KEY not configured in backend .env file",
        error: "Please set SERPAPI_KEY=your_actual_key in backend/.env"
      });
    }

    // Simple test query
    const testQuery = "tourist attractions in New York";
    const serpApiUrl = `https://serpapi.com/search.json`;

    const params = {
      engine: 'google',
      q: testQuery,
      api_key: serpApiKey,
      num: 1 // Just get 1 result for testing
    };

    console.log("[TEST-SERP] Testing SerpAPI connection...");

    const response = await request({
      method: 'GET',
      url: serpApiUrl,
      params: params
    });

    // Check if we got a valid response
    if (response.data && (response.data.organic_results || response.data.local_results || response.data.places_results)) {
      console.log("SERPAPI CONNECTED SUCCESSFULLY");
      return res.json({ 
        status: "SUCCESS",
        message: "SERPAPI CONNECTED SUCCESSFULLY",
        testQuery: testQuery,
        hasResults: !!(response.data.organic_results || response.data.local_results || response.data.places_results)
      });
    } else {
      console.log("SERPAPI FAILED - Invalid response structure");
      return res.status(500).json({ 
        status: "FAILED",
        message: "SERPAPI FAILED - Invalid response structure",
        response: response.data
      });
    }

  } catch (err) {
    console.error("[TEST-SERP] Error:", err.message);
    
    // Check for specific error types
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.log("SERPAPI FAILED - Authentication error");
      return res.status(500).json({ 
        status: "FAILED",
        message: "SERPAPI FAILED - Authentication error. Check your API key.",
        error: err.message
      });
    }
    
    if (err.response?.status === 429) {
      console.log("SERPAPI FAILED - Rate limit exceeded");
      return res.status(500).json({ 
        status: "FAILED",
        message: "SERPAPI FAILED - Rate limit exceeded",
        error: err.message
      });
    }

    console.log("SERPAPI FAILED - " + err.message);
    return res.status(500).json({ 
      status: "FAILED",
      message: "SERPAPI FAILED",
      error: err.message,
      details: err.response?.data || err.stack
    });
  }
});

module.exports = router;

