import express from 'express';
const router = express.Router();

// Definir las rutas para comentarios
router.get('clan', (req, res) => {
  // const postId = req.params.postId;
  res.send(`Ruta para obtener los comentarios de la publicación con ID ${postId}`);
});

router.put('clan', (req, res) => {
  // const postId = req.params.postId;
  res.send(`Ruta para crear un comentario en la publicación con ID ${postId}`);
});

// Exportar el enrutador
export default router;
