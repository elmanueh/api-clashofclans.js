import * as ClanController from '../controllers/clan-controller.js';

import express from 'express';
const router = express.Router();

// Route for get clan info (Clan)
router.get('/clan/:tag', async (req, res) => {
  const clanTag = req.params.tag;
  const response = await ClanController.getClan(clanTag);
  res.status(response.statusCode).json(response.content);
});

// Route for track a clan (Clan + DiscordGuild)
router.get('/track', async (req, res) => {
  const { clanTag, guildId } = req.body;
  const response = await ClanController.track(clanTag, guildId);
  res.status(response.statusCode).json(response.content);
});

// Route for untrack a clan (Clan + DiscordGuild)
router.get('/untrack', async (req, res) => {
  const { clanTag, guildId } = req.body;
  const response = await ClanController.untrack(clanTag, guildId);
  res.status(response.statusCode).json(response.content);
});

export default router;
