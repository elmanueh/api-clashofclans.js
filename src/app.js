import express from 'express';
import cors from 'cors';

const port = 80;
const app = express();
app.use(cors());

app.get('/v1/clan', async (req, res) => {
  res.send('tu puta madre');
});

// Starting app
app.listen(port, () => {
  console.log(`Server listening in port ${port}`);
});
