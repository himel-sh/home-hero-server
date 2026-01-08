const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://home-hero-client.web.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
// ...

// MongoDB connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zufsuh9.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Home Hero Server is Running now");
});

async function run() {
  try {
    // await client.connect();

    const db = client.db("home_hero_db");
    const serviceCollection = db.collection("services");
    const usersCollection = db.collection("users");
    const bookingsCollection = db.collection("bookings");

    // ---------------------
    // Users API
    // ---------------------
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      // Set default role to 'user' if not provided
      newUser.role = newUser.role || "user";
      newUser.createdAt = new Date();

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // Get user by email
    app.get("/users/email/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).send({ message: "User not found" });
        res.send(user);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch user" });
      }
    });

    // Update user by email
    app.patch("/users/email/:email", async (req, res) => {
      const email = req.params.email;
      const updateData = req.body;
      try {
        const result = await usersCollection.updateOne(
          { email },
          { $set: updateData }
        );
        if (result.matchedCount === 0)
          return res.status(404).send({ message: "User not found" });

        const updatedUser = await usersCollection.findOne({ email });
        res.send(updatedUser);
      } catch (err) {
        res.status(500).send({ error: "Failed to update user" });
      }
    });

    // Get all users (admin only)
    app.get("/users", async (req, res) => {
      const adminEmail = req.query.adminEmail;
      try {
        const admin = await usersCollection.findOne({ email: adminEmail });
        if (!admin || admin.role !== "admin") {
          return res.status(403).send({ message: "Unauthorized" });
        }

        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    // Update user role (admin only)
    app.patch("/users/:id/role", async (req, res) => {
      const userId = req.params.id;
      const { role, adminEmail } = req.body;

      try {
        const admin = await usersCollection.findOne({ email: adminEmail });
        if (!admin || admin.role !== "admin") {
          return res.status(403).send({ message: "Unauthorized" });
        }

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { role } }
        );

        if (result.matchedCount === 0)
          return res.status(404).send({ message: "User not found" });

        const updatedUser = await usersCollection.findOne({
          _id: new ObjectId(userId),
        });
        res.send(updatedUser);
      } catch (err) {
        res.status(500).send({ error: "Failed to update user role" });
      }
    });

    // ---------------------
    // Bookings API
    // ---------------------
    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    app.patch("/services/:id/reviews", async (req, res) => {
      const { id } = req.params;
      const { review } = req.body;

      if (!review || !review.userEmail || !review.rating) {
        return res.status(400).send({ message: "Invalid review data" });
      }

      try {
        const result = await serviceCollection.updateOne(
          { _id: new ObjectId(id) },
          { $push: { reviews: review } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Service not found" });
        }

        res.send({ message: "Review added successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add review" });
      }
    });

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = email ? { userEmail: email } : {};
      try {
        const bookings = await bookingsCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch bookings" });
      }
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await bookingsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ message: "Booking not found or already deleted" });
        }

        res.send({
          deletedCount: result.deletedCount,
          message: "Booking deleted successfully",
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to delete booking" });
      }
    });

    app.get("/bookings/check", async (req, res) => {
      const { userEmail, serviceId } = req.query;

      if (!userEmail || !serviceId) {
        return res
          .status(400)
          .send({ message: "Missing userEmail or serviceId" });
      }

      const existingBooking = await bookingsCollection.findOne({
        userEmail,
        serviceId,
      });
      res.send({ booked: !!existingBooking });
    });

    // ---------------------
    // Testimonials API
    // ---------------------
    app.post("/testimonials", async (req, res) => {
      const newTestimonial = req.body;
      const result = await db
        .collection("testimonials")
        .insertOne(newTestimonial);
      res.send(result);
    });

    app.get("/testimonials", async (req, res) => {
      const testimonials = await db.collection("testimonials").find().toArray();
      res.send(testimonials);
    });

    // ---------------------
    // Services API
    // ---------------------

    app.post("/services", async (req, res) => {
      const service = req.body;
      service.email = service.email.trim().toLowerCase();
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const service = await serviceCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(service);
    });

    app.get("/services", async (req, res) => {
      try {
        const { minPrice, maxPrice } = req.query;
        let filter = {};

        // Filter by price using $gte and $lte
        if (minPrice || maxPrice) {
          filter.price = {};
          if (minPrice) filter.price.$gte = Number(minPrice);
          if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const services = await serviceCollection
          .find(filter)
          .sort({ _id: 1 })
          .toArray();

        res.send(services);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch services" });
      }
    });

    // Get services for a specific provider
    app.get("/provider/services", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Provider email is required" });
      }

      try {
        const services = await serviceCollection
          .find({ email })
          .sort({ _id: -1 })
          .toArray();

        res.send(services);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch provider services" });
      }
    });

    // Update a service (only by owner)
    // Update a service (with ownership check)
    app.patch("/services/:id", async (req, res) => {
      const id = req.params.id;
      const { email: authEmail, ...fieldsToUpdate } = req.body;

      if (!authEmail) {
        return res.status(400).json({ message: "Provider email is required" });
      }

      try {
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid service ID" });
        }
        const objectId = new ObjectId(id);

        const normalizedEmail = authEmail.trim().toLowerCase();

        const existsDebug = await serviceCollection.findOne({ _id: objectId });
        console.log("EXISTS DEBUG:", existsDebug);

        const updateResult = await serviceCollection.updateOne(
          { _id: objectId, email: normalizedEmail },
          { $set: fieldsToUpdate }
        );

        console.log("UPDATE RESULT:", updateResult);

        if (updateResult.matchedCount === 0) {
          const exists = await serviceCollection.findOne({ _id: objectId });
          if (exists) {
            return res
              .status(403)
              .json({ message: "You are not allowed to update this service" });
          } else {
            return res.status(404).json({ message: "Service not found" });
          }
        }

        const updatedService = await serviceCollection.findOne({
          _id: objectId,
        });
        updatedService._id = updatedService._id.toString();

        res.json(updatedService);
      } catch (err) {
        console.error("Update failed:", err);
        res.status(500).json({ message: "Failed to update service" });
      }
    });

    // Delete a service (only by owner)
    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.body.email;

      if (!email) {
        return res.status(400).send({ message: "Provider email is required" });
      }

      try {
        const result = await serviceCollection.deleteOne({
          _id: new ObjectId(id),
          email,
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ message: "Service not found or not yours" });
        }

        res.send({ message: "Service deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to delete service" });
      }
    });

    // Ping MongoDB to check connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
    // Do not close connection; keep server running
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Home Hero Server is running on port: ${port}`);
});
