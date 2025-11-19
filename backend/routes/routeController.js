const express = require("express");
const router = express.Router();
const { request } = require("../utils/axiosWrapper");

// helper: geocode a free-text place using Nominatim
async function geocodePlace(place) {
  const url = `https://nominatim.openstreetmap.org/search`;
  const params = { q: place, format: 'json', limit: 1 };
  const res = await request({ method: 'GET', url, params });
  if (!res.data || res.data.length === 0) return null;
  const { lat, lon, display_name } = res.data[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon), name: display_name };
}

// helper: call OSRM for routing
async function getRouteFromCoords(start, end) {
  // start/end are objects { lat, lon }
  const coords = `${start.lon},${start.lat};${end.lon},${end.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}`;
  const params = { overview: 'full', geometries: 'geojson', steps: true };
  const res = await request({ method: 'GET', url, params });
  if (!res.data || !res.data.routes || res.data.routes.length === 0) return null;
  const r = res.data.routes[0];
  return {
    geometry: r.geometry,
    distance: r.distance,
    duration: r.duration,
    legs: r.legs,
  };
}

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

// Voice routing endpoint: accepts { start: string|{lat,lon}, end: string|{lat,lon} }
router.post('/voice', async (req, res) => {
  try {
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });

    // resolve start
    let startCoord = null;
    if (typeof start === 'string') startCoord = await geocodePlace(start);
    else if (start.lat && start.lon) startCoord = start;

    // resolve end
    let endCoord = null;
    if (typeof end === 'string') endCoord = await geocodePlace(end);
    else if (end.lat && end.lon) endCoord = end;

    if (!startCoord || !endCoord) return res.status(400).json({ error: 'Could not resolve start or end location' });

    const route = await getRouteFromCoords(startCoord, endCoord);
    if (!route) return res.status(500).json({ error: 'Routing failed' });

    res.json({ status: 'ok', start: startCoord, end: endCoord, route });
  } catch (err) {
    console.error('Voice routing error:', err.message);
    res.status(500).json({ error: 'Voice routing failed', details: err.message });
  }
});

module.exports = router;
