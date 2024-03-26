import { databaseUpdate } from './src/events/databaseUpdate.js';
import { currentWar } from './src/events/currentWar.js';
import * as Database from './src/services/database.js';
import {} from './src/app.js';

await Database.initialize();
// Starting update database
databaseUpdate();
// Starting event currentWar
currentWar();
