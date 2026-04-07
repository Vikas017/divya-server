require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // paise
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };
console.log("Order options ", options)
    const order = await razorpay.orders.create(options);
    res.json(order);

console.log("Order created ", order)
  } catch (err) {
    res.status(500).send(err);
  }
});

//  Verify Payment API
app.post("/verify-payment", (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    const body = order_id + "|" + payment_id;

console.log("verify paymet body", body)
    const expectedSignature = crypto
      .createHmac("sha256", "YOUR_SECRET_KEY")
      .update(body.toString())
      .digest("hex");

console.log("verify paymet sigature expected", expectedSignature)
    if (expectedSignature === signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }

  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));