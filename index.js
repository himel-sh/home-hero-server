const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri =
  "mongodb+srv://homeherodbUser:AwOBgsGFYibJl56a@cluster0.zufsuh9.mongodb.net/?appName=Cluster0";

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
    await client.connect();

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

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // ---------------------
    // Bookings API
    // ---------------------
    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
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

        res.send({ message: "Booking deleted successfully" });
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

    // Create a new service
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    // Get a single service by ID
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const service = await serviceCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(service);
    });

    // Get all services (limited to first 6)
    app.get("/services", async (req, res) => {
      try {
        const services = await serviceCollection
          .find({})
          .sort({ _id: 1 })
          .limit(6)
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
    app.patch("/services/:id", async (req, res) => {
      const id = req.params.id;
      const { email: authEmail, ...fieldsToUpdate } = req.body;

      if (!authEmail) {
        return res.status(400).json({ message: "Provider email is required" });
      }

      try {
        // Find by ID only (email check optional)
        const result = await serviceCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: fieldsToUpdate },
          { returnDocument: "after" }
        );

        if (!result.value) {
          return res.status(404).json({ message: "Service not found" });
        }

        const updatedService = {
          ...result.value,
          _id: result.value._id.toString(),
        };

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
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
    // Do not close connection; keep server running
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Home Hero Server is running on port: ${port}`);
});
