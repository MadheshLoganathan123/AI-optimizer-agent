const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const routeController = require("./routes/routeController");

const app = express();
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("AI Route Optimizer Agent Backend Running");
});

app.use("/api/route", routeController);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
