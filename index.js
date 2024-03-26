import express from 'express';
import cors from 'cors';
import * as Controller from './controller/controller.js';

const port = 80;
const app = express();
app.use(cors());

app.get('/v1/clan', async (req, res) => {
  const response = await Controller.queryDatabase('SELECT * from vista');
  res.send(response);
});

// Starting app
app.listen(port, () => {
  console.log(`Server listening in port ${port}`);
});
