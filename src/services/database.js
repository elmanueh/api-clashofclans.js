import sqlite3 from 'sqlite3';
import fs from 'fs';
import { DatabaseError } from '../../utils/errorCreate.js';

const DATABASE_FILE = './src/database/mybotdata.sqlite';
const SCRIPT_INIT_FILE = './src/database/script.sql';

// Create new connection with the database
export async function openConnection() {
  return new Promise(async (resolve, reject) => {
    const connection = new sqlite3.Database(DATABASE_FILE, (err) => {
      if (!err) return resolve(connection);
      return reject(new DatabaseError(err));
    });
    await runCommand(connection, 'PRAGMA foreign_keys = 1');
  });
}

// Close existing connection with the database
export async function closeConnection(connection) {
  return new Promise((resolve, reject) => {
    connection.close((err) => {
      if (!err) return resolve();
      return reject(new DatabaseError(err));
    });
  });
}

// Get one row in the database
export async function getSingleRow(connection, request) {
  return new Promise((resolve, reject) => {
    connection.get(request, (err, row) => {
      if (!err) return resolve(row);
      return reject(new DatabaseError(err));
    });
  });
}

// Get all the rows in the database
export async function getMultipleRow(connection, request) {
  return new Promise((resolve, reject) => {
    connection.all(request, (err, rows) => {
      if (!err) return resolve(rows);
      return reject(new DatabaseError(err));
    });
  });
}

// Execute a command in the database
export async function runCommand(connection, request) {
  return new Promise((resolve, reject) => {
    connection.run(request, function (err) {
      if (!err) return resolve(true);
      return reject(new DatabaseError(err));
    });
  });
}

// Create the database for the system
export async function initialize() {
  const db = await openConnection();
  try {
    let sqlScripts = fs.readFileSync(SCRIPT_INIT_FILE, 'utf8');
    sqlScripts = sqlScripts.split(';').map((sql) => sql.trim());
    await runCommand(db, 'BEGIN EXCLUSIVE');
    for (const sqlScript of sqlScripts) {
      if (sqlScript) await runCommand(db, sqlScript);
    }
    await runCommand(db, 'COMMIT');
  } catch (error) {
    console.log(error);
    await runCommand(db, 'ROLLBACK');
    throw new DatabaseError(error);
  } finally {
    await closeConnection(db);
  }
}
