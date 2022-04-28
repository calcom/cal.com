import { Client, Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
});

pool.query("SELECT NOW()", (err, res) => {
  console.log(err, res);
  pool.end();
});

const client = new Client({
  connectionString,
});

client.connect();

/* TODO: Add Secrets model, retrieve them and print them into a local `.env` file. */
client.query("SELECT NOW()", (err, res) => {
  console.log(err, res);
  client.end();
});
