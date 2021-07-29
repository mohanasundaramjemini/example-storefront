/** This API for get the user Stripe Id from user collections. 
 * I did not update the existing graphql schema. Instead of that, I used this alternate way to get the stripe Id.
 */
import passportMiddleware from "apiUtils/passportMiddleware";
const MongoClient = require("mongodb").MongoClient,
  format = require("util").format;

const url = "mongodb://mongo.reaction.localhost:27017";
const dbname = "reaction";
const client = new MongoClient(url);

export default async function stripeGetUser(req, res) {
  console.log('Request params ====> ', req.query);
  let userId = req.query.userId;
  await client.connect();
  const db = client.db(dbname);

  db.collection("users").find({_id: userId }).toArray(function(err, results) {
    console.log('User details ====> ', results);
    return res.status(200).send(JSON.stringify({results}));
  });
}
