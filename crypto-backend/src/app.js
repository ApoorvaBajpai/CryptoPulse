require("dotenv").config();
const portfolioRoutes = require("./routes/portfolio");

const express = require("express");
const cors = require("cors");

const coinsRoutes = require("./routes/coins");
const newsRoutes = require("./routes/news");
const cacheRoutes = require("./routes/cache");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/coins", coinsRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/cache", cacheRoutes);

app.get("/", (req, res) => {
    res.send("Crypto Backend Running");
});

app.use("/api/portfolio", portfolioRoutes);

module.exports = app;
