// Imports
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

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
const database = client.db("blogit");
const blogCollection = database.collection("blogs");
const commentCollection = database.collection("comments");
const wishlistCollection = database.collection("wishlist");
const userCollection = database.collection("users");

// Utility
function logger(req, res, next) {
    console.log(`Routing ${req.method} request through ${req.url}`);
    next();
}

// Middlewares
app.use(express.json());
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);
app.use(cookieParser());
const middleman = async (req, res, next) => {
    const { token } = req.cookies;

    //if client does not send token
    if (!token) {
        return res
            .status(401)
            .send({ message: "Not Authorized : No Access Token Found" });
    }

    // Verify token
    jwt.verify(token, process.env.ACCESS_SECRET, function (err, decoded) {
        if (err) {
            return res
                .status(401)
                .send({ message: "Not Authorized : Invalid Token" });
        }
        // attach decoded user so that others can get it
        req.user = decoded;
        next();
    });
};

// Routes
const apiBase = "/api/v1";
// Home route
app.get("/", logger, async (req, res) => {
    res.send(`Server is running.......`);
});
// JWT route
app.post(`${apiBase}/get-token`, logger, async (req, res) => {
    const user = req.body;
    console.log(`Cookie request user : ${JSON.stringify(user)}`);
    const secret = process.env.ACCESS_SECRET;
    const token = jwt.sign(user, secret);
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    }).send({ success: true });
});
app.post(`${apiBase}/delete-token`, logger, async (req, res) => {
    const user = req.body;
    console.log(`Cookie delete request user : ${JSON.stringify(user)}`);
    res.clearCookie("token", {
        maxAge: 0,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    }).send({ success: true });
});
// Blogs route
app.get(`${apiBase}/blogs`, logger, async (req, res) => {
    let query = req.query;
    try {
        const sortFiled = {};
        const filter = {};
        // Data soring/filtering based on Query
        if (query.id) {
            let id = query["id"];
            query = { _id: new ObjectId(id) };
            const result = await blogCollection.findOne(query);
            res.send(result);
        } else {
            if (query.category) {
                filter.category = query.category;
            }
            if (query.owner) {
                filter.owner = query.owner;
            }
            if (query.sort) {
                if (query.sort.startsWith("-")) {
                    sortFiled[query.sort.slice(1)] = -1;
                } else {
                    sortFiled[query.sort] = 1;
                }
            }
            const cursor = blogCollection.find(filter).sort(sortFiled);
            const result = await cursor.toArray();
            res.send(result);
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.post(`${apiBase}/blogs`, middleman, logger, async (req, res) => {
    const doc = req.body;
    try {
        const result = await blogCollection.insertOne(doc);
        res.send(`Inserted doc at id ${result.insertedId}`);
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.put(`${apiBase}/blogs`, middleman, logger, async (req, res) => {
    const query = req.query;
    try {
        if (query.id) {
            let id = query["id"];
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedData = req.body;
            const newData = {
                $set: {
                    title: updatedData.title,
                    image_url: updatedData.image_url,
                    desc_short: updatedData.desc_short,
                    desc_long: updatedData.desc_long,
                    category: updatedData.category,
                    owner: updatedData.owner,
                    time_added: updatedData.time_added,
                    time_updated: updatedData.time_updated,
                },
            };
            const result = await blogCollection.updateOne(
                filter,
                newData,
                options
            );
            res.send(result);
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.delete(`${apiBase}/blogs`, logger, async (req, res) => {
    try {
        const query = req.query;
        if (query.id) {
            let id = query["id"];
            const filter = { _id: new ObjectId(id) };
            const result = await blogCollection.deleteOne(filter);
            res.send(result);
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
// Users route
app.get(`${apiBase}/users`, middleman, logger, async (req, res) => {
    let query = req.query;
    try {
        // Data soring/filtering based on Query
        if (query.id) {
            let id = query["id"];
            query = { _id: new ObjectId(id) };
            const result = await userCollection.findOne(query);

            const queryEmail = result.email;
            const loggedInEmail = req.user.email;

            if (queryEmail !== loggedInEmail) {
                return res.status(403).send({ message: "Forbidden access" });
            } else {
                res.send(result);
            }
        }
        // Commenting out access to all user data. Can be enabled for troubleshoot in production
        // else {
        //     const cursor = userCollection.find();
        //     const result = await cursor.toArray();
        //     res.send(result);
        // }
        else {
            res.status(404).send({ message: "Not Found" });
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.post(`${apiBase}/users`, logger, async (req, res) => {
    const doc = req.body;
    try {
        const result = await userCollection.insertOne(doc);
        res.send(`Inserted doc at id ${result.insertedId}`);
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.put(`${apiBase}/users`, middleman, logger, async (req, res) => {
    const query = req.query;
    try {
        if (query.id) {
            let id = query["id"];
            const filter = { _id: new ObjectId(id) };
            const user = await userCollection.findOne(filter);
            if (user.email) {
                const queryEmail = user.email;
                const loggedInEmail = req.user.email;
                if (queryEmail !== loggedInEmail) {
                    return res
                        .status(403)
                        .send({ message: "Forbidden access" });
                } else {
                    const options = { upsert: true };
                    const updatedData = req.body;
                    const newData = {
                        $set: {
                            name: updatedData.name,
                            image_url: updatedData.image_url,
                            email: updatedData.email,
                            date_registered: updatedData.date_registered,
                        },
                    };
                    const result = await userCollection.updateOne(
                        filter,
                        newData,
                        options
                    );
                    res.send(result);
                }
            } else {
                res.status(404).send({
                    message: "Not Found",
                });
            }
        } else {
            res.send({ message: "invalid" });
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.delete(`${apiBase}/users`, middleman, logger, async (req, res) => {
    try {
        if (query.id) {
            let id = query["id"];
            const filter = { _id: new ObjectId(id) };
            const user = await userCollection.findOne(filter);
            if (user.email) {
                const queryEmail = user.email;
                const loggedInEmail = req.user.email;
                if (queryEmail !== loggedInEmail) {
                    return res
                        .status(403)
                        .send({ message: "Forbidden access" });
                } else {
                    const result = await userCollection.deleteOne(filter);
                    res.send(result);
                }
            } else {
                res.status(404).send({
                    message: "Not Found",
                });
            }
        } else {
            res.send({ message: "invalid" });
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
// Comments route
app.get(`${apiBase}/comments`, logger, async (req, res) => {
    let query = req.query;
    try {
        const sortFiled = {};
        const filter = {};
        // Data soring/filtering based on Query
        if (query.id) {
            let id = query["id"];
            query = { _id: new ObjectId(id) };
            const result = await commentCollection.findOne(query);
            res.send(result);
        } else if (query.owner || query.blog) {
            if (query.owner) {
                filter.owner = query.owner;
            }
            if (query.blog) {
                filter.blog = query.blog;
            }
            if (query.sort) {
                if (query.sort.startsWith("-")) {
                    sortFiled[query.sort.slice(1)] = -1;
                } else {
                    sortFiled[query.sort] = 1;
                }
            }
            const cursor = commentCollection.find(filter).sort(sortFiled);
            const result = await cursor.toArray();
            res.send(result);
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.post(`${apiBase}/comments`, middleman, logger, async (req, res) => {
    const doc = req.body;
    try {
        const result = await commentCollection.insertOne(doc);
        res.send(`Inserted doc at id ${result.insertedId}`);
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.put(`${apiBase}/comments`, middleman, logger, async (req, res) => {
    const query = req.query;
    try {
        if (query.id) {
            let id = query["id"];
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedData = req.body;
            const newData = {
                $set: {
                    blog: updatedData.blog,
                    owner: updatedData.owner,
                    desc: updatedData.desc,
                },
            };
            const result = await commentCollection.updateOne(
                filter,
                newData,
                options
            );
            res.send(result);
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.delete(`${apiBase}/comments`, middleman, logger, async (req, res) => {
    try {
        const query = req.query;
        if (query.id) {
            let id = query["id"];
            const filter = { _id: new ObjectId(id) };
            const result = await commentCollection.deleteOne(filter);
            res.send(result);
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
// Wishlist route
app.get(`${apiBase}/wishlist`, middleman, logger, async (req, res) => {
    let query = req.query;
    try {
        const sortFiled = {};
        const filter = {};
        // Data soring/filtering based on Query
        if (query.id) {
            let id = query["id"];
            query = { _id: new ObjectId(id) };
            const result = await wishlistCollection.findOne(query);
            res.send(result);
        } else if (query.owner) {
            let id = query.owner;
            query = { _id: new ObjectId(id) };
            const result = await userCollection.findOne(query);

            const queryEmail = result.email;
            const loggedInEmail = req.user.email;

            if (queryEmail !== loggedInEmail) {
                return res.status(403).send({ message: "Forbidden access" });
            } else {
                filter.owner = id;
                if (query.sort) {
                    if (query.sort.startsWith("-")) {
                        sortFiled[query.sort.slice(1)] = -1;
                    } else {
                        sortFiled[query.sort] = 1;
                    }
                }
                const cursor = wishlistCollection.find(filter).sort(sortFiled);
                const result = await cursor.toArray();
                res.send(result);
            }
        } else {
            res.status(404).send({ message: "Not Found" });
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.post(`${apiBase}/wishlist`, middleman, logger, async (req, res) => {
    const doc = req.body;
    try {
        const result = await wishlistCollection.insertOne(doc);
        res.send(`Inserted doc at id ${result.insertedId}`);
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
app.delete(`${apiBase}/wishlist`, middleman, logger, async (req, res) => {
    try {
        const query = req.query;
        if (query.id) {
            let id = query["id"];
            const filter = { _id: new ObjectId(id) };
            const result = await wishlistCollection.deleteOne(filter);
            res.send(result);
        }
    } catch (error) {
        console.log(`Error while routing ${req.url} : ${error}`);
    }
});
