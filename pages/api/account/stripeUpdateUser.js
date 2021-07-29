/** This API for update the user's Stripe Id to the user collection. 
 * I did not update the existing graphql schema. Instead of that, I used this alternate way to update the stripe Id.
 */
import passportMiddleware from "apiUtils/passportMiddleware";
const MongoClient = require("mongodb").MongoClient,
  format = require("util").format;

const url = "mongodb://mongo.reaction.localhost:27017";
const dbname = "reaction";
const client = new MongoClient(url);

export default async function stripeUpdateUser(req, res) {
  let userId = req.query.userId;
  let stripeId = req.query.stripeId;
  await client.connect();
  const db = client.db(dbname);

  let newvalues = { $set: { "stripeId":stripeId }};

  await db.collection("users").update({ "_id": userId}, newvalues, function(err, res) {
    try {
      return res.status(200).send(JSON.stringify({message: "User updated successfully."}));
      } catch (err) {
        return res.status(200).send(JSON.stringify({error: err.message}));
        console.log(err.message);
    }
  });
}
