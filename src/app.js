import express from 'express';
import cors from 'cors';
import playerRoutes from './routes/player-routes.js';
import clanRoutes from './routes/clan-routes.js';

const SERVER_PORT = 4321;
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/players', playerRoutes);
app.use('/clans', clanRoutes);

// Starting app
app.listen(SERVER_PORT, () => {
  console.log(`Server listening in port ${SERVER_PORT}`);
});
