// Imports
const express = require("express");

// Setup
const app = express();
const port = 4000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Middlewares
app.use(express.json());

// Utility
function logger(req, res, next) {
    console.log(`Routing ${req.method} request through ${req.url}`);
    next();
}

// Routes
app.get("/", logger, (req, res) => {
    res.send("Server is running.......");
});
