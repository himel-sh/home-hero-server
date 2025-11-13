const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://home-hero-client.web.app",
];

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman, curl, mobile
      if (!allowedOrigins.includes(origin)) {
        return callback(new Error("Not allowed by CORS"), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zufsuh9.mongodb.net/?appName=Cluster0`;

let client;
let db;

async function connectDB() {
  if (!client) {
    client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1 },
    });
    await client.connect();
    db = client.db("home_hero_db");
    console.log("Connected to MongoDB!");
  }
  return db;
}

// Root route
app.get("/", (req, res) => res.send("Home Hero Server is Running"));

// ---------------------
// Users API
// ---------------------
app.post("/users", async (req, res) => {
  try {
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const newUser = req.body;
    const existingUser = await usersCollection.findOne({
      email: newUser.email,
    });
    if (existingUser) return res.send({ message: "User already exists" });
    const result = await usersCollection.insertOne(newUser);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/users/email/:email", async (req, res) => {
  try {
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.patch("/users/email/:email", async (req, res) => {
  try {
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const email = req.params.email.toLowerCase();
    const updateData = req.body;

    const result = await usersCollection.updateOne(
      { email },
      { $set: updateData }
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ message: "User not found" });

    const updatedUser = await usersCollection.findOne({ email });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ---------------------
// Bookings API
// ---------------------
app.post("/bookings", async (req, res) => {
  try {
    const db = await connectDB();
    const bookingsCollection = db.collection("bookings");
    const result = await bookingsCollection.insertOne(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const db = await connectDB();
    const bookingsCollection = db.collection("bookings");
    const email = req.query.email;
    const query = email ? { userEmail: email } : {};
    const bookings = await bookingsCollection.find(query).toArray();
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.delete("/bookings/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const bookingsCollection = db.collection("bookings");
    const id = req.params.id;
    const result = await bookingsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    if (result.deletedCount === 0)
      return res
        .status(404)
        .json({ message: "Booking not found or already deleted" });
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

app.get("/bookings/check", async (req, res) => {
  try {
    const db = await connectDB();
    const bookingsCollection = db.collection("bookings");
    const { userEmail, serviceId } = req.query;
    if (!userEmail || !serviceId)
      return res
        .status(400)
        .json({ message: "Missing userEmail or serviceId" });
    const existingBooking = await bookingsCollection.findOne({
      userEmail,
      serviceId,
    });
    res.json({ booked: !!existingBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check booking" });
  }
});

// ---------------------
// Testimonials API
// ---------------------
app.post("/testimonials", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("testimonials").insertOne(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

app.get("/testimonials", async (req, res) => {
  try {
    const db = await connectDB();
    const testimonials = await db.collection("testimonials").find().toArray();
    res.json(testimonials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

// ---------------------
// Services API
// ---------------------
app.post("/services", async (req, res) => {
  try {
    const db = await connectDB();
    const serviceCollection = db.collection("services");
    const service = req.body;
    service.email = service.email.trim().toLowerCase();
    const result = await serviceCollection.insertOne(service);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create service" });
  }
});

app.get("/services", async (req, res) => {
  try {
    const db = await connectDB();
    const serviceCollection = db.collection("services");
    const { minPrice, maxPrice } = req.query;
    let filter = {};
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    const services = await serviceCollection.find(filter).toArray();
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.get("/services/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const serviceCollection = db.collection("services");
    const service = await serviceCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch service" });
  }
});

app.patch("/services/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const serviceCollection = db.collection("services");
    const id = req.params.id;
    const { email, ...updateFields } = req.body;
    if (!email)
      return res.status(400).json({ message: "Provider email is required" });

    const updateResult = await serviceCollection.updateOne(
      { _id: new ObjectId(id), email: email.trim().toLowerCase() },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      const exists = await serviceCollection.findOne({ _id: new ObjectId(id) });
      if (exists)
        return res
          .status(403)
          .json({ message: "Not allowed to update this service" });
      return res.status(404).json({ message: "Service not found" });
    }

    const updatedService = await serviceCollection.findOne({
      _id: new ObjectId(id),
    });
    res.json(updatedService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update service" });
  }
});

app.delete("/services/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const serviceCollection = db.collection("services");
    const { email } = req.body;
    const id = req.params.id;

    if (!email)
      return res.status(400).json({ message: "Provider email is required" });

    const result = await serviceCollection.deleteOne({
      _id: new ObjectId(id),
      email: email.trim().toLowerCase(),
    });

    if (result.deletedCount === 0)
      return res
        .status(404)
        .json({ message: "Service not found or not yours" });

    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// ---------------------
// Reviews API
// ---------------------
app.patch("/services/:id/reviews", async (req, res) => {
  try {
    const db = await connectDB();
    const serviceCollection = db.collection("services");
    const { review } = req.body;

    if (!review || !review.userEmail || !review.rating)
      return res.status(400).json({ message: "Invalid review data" });

    const updateResult = await serviceCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { reviews: review } }
    );

    if (updateResult.matchedCount === 0)
      return res.status(404).json({ message: "Service not found" });

    res.json({ message: "Review added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add review" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Home Hero Server is running on port ${port}`);
});
