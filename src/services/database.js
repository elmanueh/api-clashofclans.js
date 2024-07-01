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
async function getConnection() {
  const connection = await pool.getConnection();
  return connection;
}

// Function to close the connection
async function releaseConnection(connection) {
  await connection.release();
}

// Execute a SELECT or UPDATE or DELETE query
export async function executeQuery(connection, sql) {
  const [results, fields] = await connection.query(sql);
  return results;
}

// Begin a transaction
export async function beginTransaction() {
  const connection = await getConnection();
  await connection.beginTransaction();
  return connection;
}

// Commit a transaction
export async function commitTransaction(connection) {
  await connection.commit();
  await releaseConnection(connection);
}

// Rollback a transaction
export async function rollbackTransaction(connection) {
  await connection.rollback();
  await releaseConnection(connection);
}
