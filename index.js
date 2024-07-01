import express from 'express';
import cors from 'cors';
import playerRoutes from './src/routes/player-routes.js';
import clanRoutes from './src/routes/clan-routes.js';
import { databaseUpdate } from './src/events/database-update.js';
import { currentWar } from './src/events/currentwar-update.js';
import { config } from 'dotenv';
config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/players', playerRoutes);
app.use('/clans', clanRoutes);

// Starting app
app.listen(process.env.API_PORT, () => {
  console.log(`Server listening in port ${process.env.API_PORT}`);
});

// Starting events
databaseUpdate();
currentWar();
