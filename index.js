const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
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
