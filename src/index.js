/*require("dotenv").config();
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

app.listen(5000, () => console.log("Server running on port 5000"));*/
require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

const app = express();
app.use(express.json());
app.use(cors());

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;
const BASE_URL = process.env.PHONEPE_BASE_URL;
const SERVER_URL = process.env.DOMAIN_URL;


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
// ✅ CREATE ORDER (PHONEPE)
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const txnId = "TXN_" + Date.now();

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: txnId,
      merchantUserId: "USER123",
      amount: amount * 100,
      redirectUrl: `${SERVER_URL}/redirect`,
      callbackUrl: `${SERVER_URL}/webhook`,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

    const hash = crypto
      .createHash("sha256")
      .update(base64Payload + "/pg/v1/pay" + SALT_KEY)
      .digest("hex");

    const checksum = hash + "###" + SALT_INDEX;

    const response = await axios.post(
      `${BASE_URL}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          "X-VERIFY": checksum
        }
      }
    );

    const url =
      response.data?.data?.instrumentResponse?.redirectInfo?.url;

    res.json({
      orderId: txnId,
      url: url
    });

  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

// ✅ VERIFY PAYMENT (STATUS CHECK)
app.get("/verify-payment/:txnId", async (req, res) => {
  try {
    const txnId = req.params.txnId;

    const endpoint = `/pg/v1/status/${MERCHANT_ID}/${txnId}`;

    const hash = crypto
      .createHash("sha256")
      .update(endpoint + SALT_KEY)
      .digest("hex");

    const checksum = hash + "###" + SALT_INDEX;

    const response = await axios.get(
      `${BASE_URL}${endpoint}`,
      {
        headers: {
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": MERCHANT_ID
        }
      }
    );

    res.json(response.data);

  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    console.log("PHONEPE WEBHOOK:", body);

    const merchantTxnId = body?.payload?.payment?.entity?.merchantTransactionId;
    const status = body?.payload?.payment?.entity?.state;

    if (!merchantTxnId) {
      return res.status(400).send("Invalid webhook");
    }

    // update DB
    await db.collection("users")
      .doc(body.payload.payment.entity.merchantUserId)
      .collection("orders")
      .doc(merchantTxnId)
      .update({
        paymentStatus: status === "COMPLETED" ? "SUCCESS" : "FAILED"
      });

    res.sendStatus(200);

  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});
app.listen(5000, () => console.log("Server running on 5000"));