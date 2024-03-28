import { databaseUpdate } from './src/events/database-update.js';
import { currentWar } from './src/events/currentwar-update.js';
import * as Database from './src/services/database.js';
import {} from './src/app.js';

try {
  // Initialize the database if it is not created
  await Database.initialize();

  // Starting event update database
  databaseUpdate();

  // Starting event track current war
  currentWar();
} catch (error) {
  console.log(error);
}
