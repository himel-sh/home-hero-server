const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

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

    // users APIs

    app.post("/users", async (req, res) => {
      const newUser = req.body;

      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // bookings APIs

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

        res.send({
          message: "Booking deleted successfully",
          deletedCount: result.deletedCount,
        });
      } catch (err) {
        console.error("Error deleting booking:", err);
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

      const query = { userEmail, serviceId };
      const existingBooking = await bookingsCollection.findOne(query);

      res.send({ booked: !!existingBooking });
    });

    //testimonials APIs

    app.post("/testimonials", async (req, res) => {
      const newTestimonial = req.body;
      const result = await db
        .collection("testimonials")
        .insertOne(newTestimonial);
      res.send(result);
    });

    app.get("/testimonials", async (req, res) => {
      const cursor = db.collection("testimonials").find();
      const testimonials = await cursor.toArray();
      res.send(testimonials);
    });

    //servicess APIs

    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await db
          .collection("services")
          .deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to delete service" });
      }
    });

    app.patch("/services/:id", async (req, res) => {
      const id = req.params.id;
      const updatedFields = req.body;

      try {
        const result = await db
          .collection("services")
          .findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updatedFields },
            { returnDocument: "after" }
          );

        res.send(result.value);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to update service" });
      }
    });

    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    app.get("/services", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Home Hero Server is running on port: ${port}`);
});
