const express = require("express");
const router = express.Router();

// placeholder
router.post("/get", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend connected successfully (Day 1)"
  });
});

module.exports = router;
