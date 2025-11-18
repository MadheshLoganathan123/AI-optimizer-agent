const express = require("express");
const router = express.Router();

router.get("/osm", (req, res) => {
  res.json({ status: "OSM API test route working" });
});

module.exports = router;
