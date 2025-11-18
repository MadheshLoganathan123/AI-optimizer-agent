const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/review", async (req, res) => {
  try {
    const { review_id } = req.query;
    if (!review_id) {
      return res.status(400).json({ error: "review_id is required" });
    }

    const options = {
      method: 'GET',
      url: `https://maps-data.p.rapidapi.com/review.php`,
      params: { review_id },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST
      }
    };

    const response = await axios.request(options);
    res.json({ status: "ok", data: response.data });

  } catch (err) {
    console.error("RapidAPI Error:", err.message);
    res.status(500).json({ error: "RapidAPI request failed", details: err.message });
  }
});

// Existing test endpoint
router.post("/get", (req, res) => {
  res.json({ status: "ok", message: "Backend Connected Successfully" });
});

module.exports = router;
