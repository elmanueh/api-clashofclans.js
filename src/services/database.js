import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

// Database connection configuration
const pool = mysql.createPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  connectionLimit: process.env.DB_CONNECTION_LIMIT,
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTION,
  queueLimit: process.env.DB_QUEUE_LIMIT
});

// Get a connection from the pool
export async function getConnection() {
  const connection = await pool.getConnection();
  return connection;
}

// Function to close the connection
export async function releaseConnection(connection) {
  try {
    await connection.release();
  } catch (error) {
    console.log(error);
  }
}

// Execute a query
export async function executeQuery(connection, sql) {
  const [results, fields] = await connection.query(sql);
  return results;
}

export async function Select(connection, table, condition = null) {
  let [results, fields] = [];
  if (!condition) {
    [results, fields] = await connection.query(`SELECT * FROM ${table}`);
  } else {
    [results, fields] = await connection.query(`SELECT * FROM ${table} WHERE ${condition}`);
  }
  return results;
}

export async function Insert(connection, table, params, values) {
  await connection.query(`INSERT INTO ${table} (${params}) VALUES (${values})`);
}

export async function Update(connection, table, set, condition = null) {
  if (!condition) {
    await connection.query(`UPDATE ${table} SET ${set}`);
  } else {
    await connection.query(`UPDATE ${table} SET ${set} WHERE ${condition}`);
  }
}

export async function Delete(connection, table, condition = null) {
  if (!condition) {
    await connection.query(`DELETE FROM ${table}`);
  } else {
    await connection.query(`DELETE FROM ${table} WHERE ${condition}`);
  }
}
