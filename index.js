const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Home Hero Server is Running");
});

app.listen(port, () => {
  console.log(`Home Hero Server is running on port: ${port}`);
});
