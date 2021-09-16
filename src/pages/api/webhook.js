import { buffer } from "micro";
import * as admin from "firebase-admin";

// secure a connection to FIREBASE from the backend
const serviceAccount = require("../../../permissions.json");
const app = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  : admin.app();

//   Establish connection to Stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_SIGNING_SECRET;

const fullfillOrder = async (session) => {
  // cosole.log('FullFIllinf order, session')
  return app
    .firestore()
    .collection("users")
    .doc(session.metadata.email)
    .collection("orders")
    .doc(session.id)
    .set({
      amount: session.amount_total / 100,
      amount_shipping: session.total_details.amount_shipping / 100,
      images: JSON.parse(session.metadata.images),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
    .then(() => {
      console.log(`Succes: order ${session.id} had been added to the DB`);
    });
};
export default async (req, res) => {
  if (req.method === "post") {
    const requestBuffer = await buffer(req);
    const payload = requestBuffer.toString();
    const sig = req.headers("stripe-signature");

    let event;

    // Verify That the EVENT posted camer from stripe
    try {
      event = stripe.webhooks.construcEvent(payload, sig, endpointSecret);
    } catch (err) {
      console.log("Error", err.message);
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    // Handle the checkout.session.competed.event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      //   Fullfill the order
      return fullfillOrder(session)
        .then(() => res.status(200))
        .catch((err) => res.status(400).send(`webhook Error: ${err.message}`));
    }
  }
};

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
