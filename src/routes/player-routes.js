import * as PlayerController from '../controllers/player-controller.js';

import express from 'express';
const router = express.Router();

// Route for link an account (Player + DiscordUser)
router.post('/linkaccount', async (req, res) => {
  const { tag: playerTag, token: playerToken, discordId: userId } = req.body;
  const response = await PlayerController.linkAccount(playerTag, playerToken, userId);
  res.status(response.statusCode).json(response.content);
});

// Route for get player info (Player)
router.get('/player/:tag', async (req, res) => {
  const playerTag = req.params.tag;
  const response = await PlayerController.getPlayer(playerTag);
  res.status(response.statusCode).json(response.content);
});

// Route for unlink an account (Player + DiscordUser)
router.post('/unlinkaccount', async (req, res) => {
  const { tag: playerTag, discordId: userId } = req.body;
  const response = await PlayerController.unlinkAccount(playerTag, userId);
  res.status(response.statusCode).json(response.content);
});

export default router;
