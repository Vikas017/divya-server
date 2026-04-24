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
app.use((req, res, next) => {
  console.log("\n==============================");
  console.log("➡️ REQUEST:", req.method, req.url);
  console.log("➡️ BODY:", req.body);
  console.log("==============================\n");
  next();
});
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
    console.log("🔵 STEP 1: Create Order Started");

    const { amount } = req.body;

    console.log("🔵 STEP 2: Amount received =", amount);

    const txnId = "TXN_" + Date.now();
    console.log("🔵 STEP 3: Transaction ID =", txnId);

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: txnId,
      merchantUserId: "USER123",
      amount: amount * 100,
      redirectUrl: `${SERVER_URL}/redirect`,
      callbackUrl: `${SERVER_URL}/webhook`,
      paymentInstrument: { type: "PAY_PAGE" }
    };

    console.log("🔵 STEP 4: Payload created =", payload);

    const jsonString = JSON.stringify(payload);
    console.log("🔵 STEP 5: JSON string length =", jsonString.length);

    const base64Payload = Buffer.from(jsonString).toString("base64");
    console.log("🔵 STEP 6: Base64 payload =", base64Payload);

    const stringToHash = base64Payload + "/pg/v1/pay" + SALT_KEY;
    console.log("🔵 STEP 7: String to hash =", stringToHash);

    const hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    console.log("🔵 STEP 8: SHA256 hash =", hash);

    const checksum = hash + "###" + SALT_INDEX;
    console.log("🔵 STEP 9: Checksum =", checksum);

    const url = `${BASE_URL}/apis/hermes/pg/v1/pay`;
    console.log("🔵 STEP 10: Final URL =", url);

    console.log("🔵 STEP 11: Sending request to PhonePe...");

    const response = await axios.post(
      url,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum
        }
      }
    );

    console.log("🟢 STEP 12: PhonePe Response =", response.data);

    const redirectUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url;

    console.log("🟢 STEP 13: Redirect URL =", redirectUrl);

    res.json({
      orderId: txnId,
      url: redirectUrl
    });

  } catch (e) {
    console.log("❌ ERROR IN CREATE ORDER");
    console.log("Message:", e.message);
    console.log("Response:", e.response?.data);
    console.log("Status:", e.response?.status);

    res.status(500).json({
      error: e.response?.data || e.message
    });
  }
});

// ✅ VERIFY PAYMENT (STATUS CHECK)
app.get("/verify-payment/:txnId", async (req, res) => {
  try {
    console.log("🔵 VERIFY STEP 1");

    const txnId = req.params.txnId;
    console.log("🔵 STEP 2: txnId =", txnId);

    const endpoint = `/pg/v1/status/${MERCHANT_ID}/${txnId}`;
    console.log("🔵 STEP 3: endpoint =", endpoint);

    const stringToHash = endpoint + SALT_KEY;
    console.log("🔵 STEP 4: stringToHash =", stringToHash);

    const hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    console.log("🔵 STEP 5: hash =", hash);

    const checksum = hash + "###" + SALT_INDEX;
    console.log("🔵 STEP 6: checksum =", checksum);

    const url = `${BASE_URL}${endpoint}`;
    console.log("🔵 STEP 7: URL =", url);

    const response = await axios.get(url, {
      headers: {
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": MERCHANT_ID
      }
    });

    console.log("🟢 STEP 8: Response =", response.data);

    res.json(response.data);

  } catch (e) {
    console.log("❌ VERIFY ERROR");
    console.log(e.response?.data || e.message);

    res.status(500).json(e.response?.data || { error: e.message });
  }
});
app.post("/webhook", async (req, res) => {
  try {
    console.log("🔵 WEBHOOK HIT");

    const body = req.body;

    console.log("🔵 RAW BODY:", JSON.stringify(body, null, 2));

    const merchantTxnId =
      body?.payload?.payment?.entity?.merchantTransactionId;

    const status =
      body?.payload?.payment?.entity?.state;

    const merchantUserId =
      body?.payload?.payment?.entity?.merchantUserId;

    console.log("🔵 txnId =", merchantTxnId);
    console.log("🔵 status =", status);
    console.log("🔵 userId =", merchantUserId);

    if (!merchantTxnId) {
      console.log("❌ Invalid webhook payload");
      return res.status(400).send("Invalid");
    }

    await db.collection("users")
      .doc(merchantUserId)
      .collection("orders")
      .doc(merchantTxnId)
      .update({
        paymentStatus: status
      });

    console.log("🟢 DB UPDATED SUCCESSFULLY");

    res.sendStatus(200);

  } catch (e) {
    console.log("❌ WEBHOOK ERROR");
    console.log(e.message);

    res.sendStatus(500);
  }
});
app.listen(5000, () => console.log("Server running on 5000"));