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
// //PHONEPE
// require("dotenv").config();
// const express = require("express");
// const crypto = require("crypto");
// const cors = require("cors");
// const axios = require("axios");
// const admin = require("firebase-admin");
// const serviceAccount = require("../serviceAccountKey.json");

// const app = express();
// app.use(express.json());
// app.use(cors());
// app.use((req, res, next) => {
//   console.log("\n==============================");
//   console.log("➡️ REQUEST:", req.method, req.url);
//   console.log("➡️ BODY:", req.body);
//   console.log("==============================\n");
//   next();
// });
// const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
// const SALT_KEY = process.env.PHONEPE_SALT_KEY;
// const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;
// const BASE_URL = process.env.PHONEPE_BASE_URL;
// const SERVER_URL = process.env.DOMAIN_URL;

// admin.initializeApp({credential: admin.credential.cert(serviceAccount),}); //initialize firebase admin

// const db = admin.firestore();
// // ✅ CREATE ORDER (PHONEPE)
// app.post("/create-order", async (req, res) => {
//   try {
//     console.log("🔵 STEP 1: Create Order Started");

//     const { amount, userId } = req.body;

//     console.log("🔵 STEP 2: Amount received =", amount);

//     const txnId = "TXN_" + Date.now();
//     console.log("🔵 STEP 3: Transaction ID =", txnId);

//     const payload = {
//       merchantId: MERCHANT_ID,
//       merchantTransactionId: txnId,
//       merchantUserId: "USER123" || userId,
//       amount: amount * 100,
//       redirectUrl: `divya-bliss://payment-result?txnId=${txnId}`,
//       callbackUrl: `${SERVER_URL}/webhook`,
//       paymentInstrument: { type: "PAY_PAGE" }
//     };

//     console.log("🔵 STEP 4: Payload created =", payload);

//     const jsonString = JSON.stringify(payload);
//     console.log("🔵 STEP 5: JSON string length =", jsonString.length);

//     const base64Payload = Buffer.from(jsonString).toString("base64");
//     console.log("🔵 STEP 6: Base64 payload =", base64Payload);

//     const stringToHash = base64Payload + "/pg/v1/pay" + SALT_KEY;
//     console.log("🔵 STEP 7: String to hash =", stringToHash);

//     const hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
//     console.log("🔵 STEP 8: SHA256 hash =", hash);

//     const checksum = hash + "###" + SALT_INDEX;
//     console.log("🔵 STEP 9: Checksum =", checksum);

//     const url = `${BASE_URL}/pg/v1/pay`;

//     console.log("🔵 STEP 10: Final URL =", url);

//     console.log("🔵 STEP 11: Sending request to PhonePe...");

// const response = await axios.post(
//   url,
//   { request: base64Payload },
//   {
//     headers: {
//       "Content-Type": "application/json",
//       "X-VERIFY": checksum
//     }
//   }
// );

//     console.log("🟢 STEP 12: PhonePe Response =", response.data);

//     const redirectUrl =
//       response.data?.data?.instrumentResponse?.redirectInfo?.url;

//     console.log("🟢 STEP 13: Redirect URL =", redirectUrl);

//     res.json({
//       id: txnId,
//       paymentUrl: redirectUrl
//     });

//   } catch (e) {
//     console.log("❌ ERROR IN CREATE ORDER");
//     console.log("Message:", e.message);
//     console.log("Response:", e.response?.data);
//     console.log("Status:", e.response?.status);

//     res.status(500).json({
//       error: e.response?.data || e.message
//     });
//   }
// });

// // ✅ VERIFY PAYMENT (STATUS CHECK)
// app.get("/verify-payment/:txnId", async (req, res) => {
//   try {
//     const txnId = req.params.txnId;

//     const endpoint = `/pg/v1/status/${MERCHANT_ID}/${txnId}`;

//     const stringToHash = endpoint + SALT_KEY;

//     const hash = crypto
//       .createHash("sha256")
//       .update(stringToHash)
//       .digest("hex");

//     const checksum = hash + "###" + SALT_INDEX;

//     const url = `${BASE_URL}${endpoint}`;

//     const response = await axios.get(url, {
//       headers: {
//         "X-VERIFY": checksum,
//         "X-MERCHANT-ID": MERCHANT_ID,
//       },
//     });

//     const status = response.data?.data?.state;

//     // Normalize status
//     let finalStatus = "PENDING";
//     if (status === "COMPLETED" || status === "SUCCESS") {
//       finalStatus = "SUCCESS";
//     } else if (status === "FAILED") {
//       finalStatus = "FAILED";
//     }

//     // Update Firebase
//     const userSnap = await db.collectionGroup("orders")
//       .where("txnId", "==", txnId)
//       .get();

//     userSnap.forEach(async (doc) => {
//       await doc.ref.update({
//         status: finalStatus,
//         rawStatus: status,
//         updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//       });
//     });

//     res.json({
//       txnId,
//       status: finalStatus,
//       raw: response.data,
//     });

//   } catch (err) {
//     console.log("VERIFY ERROR:", err.response?.data || err.message);
//     res.status(500).json({ error: err.message });
//   }
// });
// app.post("/webhook", async (req, res) => {
//   try {
//     const body = req.body;

//     const txnId =
//       body?.payload?.payment?.entity?.merchantTransactionId;

//     const status =
//       body?.payload?.payment?.entity?.state;

//     const userId =
//       body?.payload?.payment?.entity?.merchantUserId;

//     if (!txnId) return res.status(400).send("Invalid");

//     let finalStatus = "PENDING";

//     if (status === "SUCCESS") finalStatus = "SUCCESS";
//     else if (status === "FAILED") finalStatus = "FAILED";

//     await db.collection("users")
//       .doc(userId)
//       .collection("orders")
//       .doc(txnId)
//       .set({
//         status: finalStatus,
//         updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//       }, { merge: true });

//     console.log("WEBHOOK UPDATED:", txnId, finalStatus);

//     res.sendStatus(200);

//   } catch (err) {
//     console.log("WEBHOOK ERROR:", err.message);
//     res.sendStatus(500);
//   }
// });
// app.listen(5000, () => console.log("Server running on 5000"));

require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
//const serviceAccount = require("../serviceAccountKey.json");

const app = express();
app.use(express.json());
app.use(cors());

// 🔍 LOGGING
app.use((req, res, next) => {
  console.log("\n==============================");
  console.log("➡️ REQUEST:", req.method, req.url);
  console.log("➡️ BODY:", req.body);
  console.log("==============================\n");
  next();
});

// ENV
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;
const BASE_URL = process.env.PHONEPE_BASE_URL;
const SERVER_URL = process.env.DOMAIN_URL;

// FIREBASE INIT
// admin.initializeApp({
//   credential: admin.credential.cert({
//     type: process.env.SERVICE_ACCOUNT_TYPE,
//     project_id: process.env.SERVICE_PROJECT_ID,
//     private_key_id: process.env.SERVICE_PRIVATE_KEY_ID,
//     private_key: process.env.SERVICE_PRIVATE_KEY.replace(/\\n/g, '\n'),
//     client_email: process.env.SERVICE_CLIENT_EMAIL,
//     client_id: process.env.SERVICE_CLIENT_ID,
//     auth_uri: process.env.SERVICE_AUTH_URL,
//     token_uri: process.env.SERVICE_TOKEN_URI,
//     auth_provider_x509_cert_url: process.env.SERVICE_AUTH_PROVIDER_X509_CERT_URL,
//     client_x509_cert_url: process.env.SERVICE_CLIENT_X509_CERT_URL,
//     universe_domain: process.env.SERVICE_UNIVERSE_DOMAIN,
//   }),
// });
console.log(" Starting Firebase Admin Init...");

console.log(" ENV CHECK:");
console.log("PROJECT_ID:", process.env.SERVICE_PROJECT_ID);
console.log("CLIENT_EMAIL:", process.env.SERVICE_CLIENT_EMAIL);
console.log(
  "PRIVATE_KEY:",
  process.env.SERVICE_PRIVATE_KEY ? "EXISTS" : "MISSING"
);

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.SERVICE_ACCOUNT_TYPE,
    project_id: process.env.SERVICE_PROJECT_ID,
    private_key_id: process.env.SERVICE_PRIVATE_KEY_ID,
    private_key: process.env.SERVICE_PRIVATE_KEY
      ? process.env.SERVICE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
    client_email: process.env.SERVICE_CLIENT_EMAIL,
    client_id: process.env.SERVICE_CLIENT_ID,
    auth_uri: process.env.SERVICE_AUTH_URL,
    token_uri: process.env.SERVICE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.SERVICE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.SERVICE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.SERVICE_UNIVERSE_DOMAIN,
  }),
});

console.log("🔥 Firebase Admin Initialized", {
    type: process.env.SERVICE_ACCOUNT_TYPE,
    project_id: process.env.SERVICE_PROJECT_ID,
    private_key_id: process.env.SERVICE_PRIVATE_KEY_ID,
    private_key: process.env.SERVICE_PRIVATE_KEY
      ? process.env.SERVICE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
    client_email: process.env.SERVICE_CLIENT_EMAIL,
    client_id: process.env.SERVICE_CLIENT_ID,
    auth_uri: process.env.SERVICE_AUTH_URL,
    token_uri: process.env.SERVICE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.SERVICE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.SERVICE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.SERVICE_UNIVERSE_DOMAIN,
  });
const db = admin.firestore();

// =======================================
// CREATE ORDER
// =======================================
app.post("/create-order", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const txnId = "TXN_" + Date.now();

    if (!amount || !userId) {
      console.error(`!amount || !userId no daaata ${amount} || ${userId}`);

      return res.status(400).json({ error: "Missing fields" });
    }
    try {
      // ✅ STORE ORDER IN FIREBASE
      await db
        .collection("users")
        .doc(userId)
        .collection("orders")
        .doc(txnId)
        .set({
          txnId,
          amount,
          status: "PENDING",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log("✅ FIRESTORE WRITE SUCCESS");
    } catch (dbError) {
      console.log("🔥 FIRESTORE ERROR:", dbError);
    }

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: txnId,
      merchantUserId: userId,
      amount: amount * 100,
      redirectUrl: `divya-bliss://payment-result?txnId=${txnId}`,
      callbackUrl: `${SERVER_URL}/webhook`,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
      "base64",
    );

    const stringToHash = base64Payload + "/pg/v1/pay" + SALT_KEY;

    const checksum =
      crypto.createHash("sha256").update(stringToHash).digest("hex") +
      "###" +
      SALT_INDEX;

    const url = `${BASE_URL}/pg/v1/pay`;

    const response = await axios.post(
      url,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      },
    );

    const paymentUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url;

    res.json({
      id: txnId,
      paymentUrl,
    });
  } catch (e) {
    console.log("❌ CREATE ORDER ERROR:", e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// =======================================
// VERIFY PAYMENT
// =======================================
app.get("/verify-payment/:txnId", async (req, res) => {
  try {
    console.log("\n================ VERIFY START ================");

    const txnId = req.params.txnId;
    const userId = req.query.userId; // ✅ from Android

    console.log("🔵 txnId:", txnId);
    console.log("🔵 userId:", userId);

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    const endpoint = `/pg/v1/status/${MERCHANT_ID}/${txnId}`;

    const stringToHash = endpoint + SALT_KEY;

    const hash = crypto.createHash("sha256").update(stringToHash).digest("hex");

    const checksum = hash + "###" + SALT_INDEX;

    const url = `${BASE_URL}${endpoint}`;

    console.log("➡️ Calling PhonePe API...");

    const response = await axios.get(url, {
      headers: {
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
    });

    console.log("🟢 RESPONSE:", response.data);

    const state = response.data?.data?.state;

    let finalStatus = "PENDING";
    if (state === "COMPLETED") finalStatus = "SUCCESS";
    else if (state === "FAILED") finalStatus = "FAILED";

    console.log("🟢 FINAL STATUS:", finalStatus);

    // ✅ DIRECT UPDATE (BEST APPROACH)
    await db
      .collection("users")
      .doc(userId)
      .collection("orders")
      .doc(txnId)
      .update({
        status: finalStatus,
        rawStatus: state,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log("🟢 FIRESTORE UPDATED SUCCESSFULLY");

    console.log("================ VERIFY END ================");

    res.json({
      txnId,
      userId,
      status: finalStatus,
      raw: response.data,
    });
  } catch (err) {
    console.log("\n================ VERIFY ERROR ================");
    console.log("❌ MESSAGE:", err.message);
    console.log("❌ RESPONSE:", err.response?.data);
    console.log("============================================\n");

    res.status(500).json({ error: err.message });
  }
});

// =======================================
// WEBHOOK (IMPORTANT)
// =======================================
app.post("/webhook", async (req, res) => {
  try {
    const base64Response = req.body.response;

    const decoded = JSON.parse(
      Buffer.from(base64Response, "base64").toString("utf-8"),
    );

    console.log("🟢 DECODED WEBHOOK:", decoded);

    const txnId = decoded?.data?.merchantTransactionId;
    const status = decoded?.data?.state;
    const userId = decoded?.data?.merchantUserId;

    if (!txnId) return res.status(400).send("Invalid");

    let finalStatus = "PENDING";

    if (status === "COMPLETED") finalStatus = "SUCCESS";
    else if (status === "FAILED") finalStatus = "FAILED";

    await db
      .collection("users")
      .doc(userId)
      .collection("orders")
      .doc(txnId)
      .set(
        {
          txnId,
          status: finalStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    console.log("✅ WEBHOOK UPDATED:", txnId, finalStatus);

    res.sendStatus(200);
  } catch (err) {
    console.log("❌ WEBHOOK ERROR:", err.message);
    res.sendStatus(500);
  }
});

// =======================================
// 🚀 START SERVER
// =======================================
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
