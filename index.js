const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

// mongodb
const uri = `${process.env.MONGODB_URL}`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify jwt token
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productCollection = client.db("best-seller").collection("products");
    const userCollection = client.db("best-seller").collection("user");
    const orderCollection = client.db("best-seller").collection("order");

    const verifySeller = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email: email });
      if (user.role === "Admin") {
        next();
      } else if (user.role === "Seller") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    };

    // get products
    app.get("/products", async (req, res) => {
      const query = { status: "available" };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    // get product by id
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });

    // update product by id
    app.put("/update-product/:id", async (req, res) => {
      const id = req.params.id;
      const update = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: update,
      };
      const result = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.send(result);
    });

    // get category products
    app.get("/category/:name", async (req, res) => {
      const category = req.params.name;
      const query = { brand: category, status: "available" };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    // get advertised products
    app.get("/advertised", async (req, res) => {
      const query = { advertised: true };
      const product = await productCollection.find(query).toArray();
      res.send(product);
    });

    // add product to advertised
    app.put("/advertised/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: { advertised: true },
      };
      const product = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(product);
    });

    // get order by email
    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { email: email };
      const order = await orderCollection.find(query).toArray();
      res.send(order);
    });

    // add order
    app.post("/order", async (req, res) => {
      const body = req.body;
      const result = await orderCollection.insertOne(body);
      res.send(result);
    });

    // get my products
    app.get("/my-product", verifyJWT, verifySeller, async (req, res) => {
      const email = req.decoded.email;
      const product = await productCollection.find({ email: email }).toArray();
      res.send(product);
    });

    // login a new user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
      res.send({ result, token });
    });

    // set user type
    app.put("/user/type/:email", async (req, res) => {
      const email = req.params.email;
      const body = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: body,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // check admin
    app.get("/admin", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.role === "Admin") {
        res.send(user);
      } else {
        res.send({ isAdmin: false });
      }
    });

    // check seller
    app.get("/seller", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.role === "Seller") {
        res.send(user);
      } else {
        res.send({ isAdmin: false });
      }
    });
  } finally {
  }
}
run();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
