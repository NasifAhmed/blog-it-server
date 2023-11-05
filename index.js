// Imports
const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

// Setup
const app = express();
const port = 4000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
// MongoDB Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nmxrrle.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
const database = client.db("book-collection");
const userCollection = database.collection("users");
const bookCollection = database.collection("books");

// Middlewares
app.use(express.json());

// Utility
function logger(req, res, next) {
    console.log(`Routing ${req.method} request through ${req.url}`);
    next();
}

// Routes
app.get("/", logger, async (req, res) => {
    res.send(`Server is running.......`);
});
