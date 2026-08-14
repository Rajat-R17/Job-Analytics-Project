const analyticsRoute = require("./routes/analytics");
const uploadRoute = require("./routes/upload");
const express = require("express");
const cors = require("cors");
const datasetService = require("./services/dataset");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Job Market Analytics Backend Running 🚀",
    version: "1.0.0"
  });
});

app.use("/upload", uploadRoute);
app.use("/analytics", analyticsRoute);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// Pre-load dataset on server boot
datasetService.ensureDataLoaded()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("⚠️ Failed to pre-load dataset on boot:", err);
    app.listen(PORT, () => {
      console.log(`⚠️ Server running on http://localhost:${PORT} (Dataset uninitialized)`);
    });
  });