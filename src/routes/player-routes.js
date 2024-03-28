import * as PlayerController from '../controllers/player-controller.js';
import express from 'express';
const router = express.Router();

router.post('/linkaccount', async (req, res) => {
  const { tag, token, discordId } = req.body;
  const response = await PlayerController.linkAccount(tag, token, discordId);
  res.status(200).send(`${response}`);
});
// Definir las rutas para comentarios
/*router.get('/:tag', async (req, res) => {
  const playerTag = req.params.tag;
  console.log(playerTag);
  console.log(2);
  const a = await PlayerController.getPlayer(playerTag);
  res.send(a);
});*/

// Exportar el enrutador
export default router;
