import express from 'express';
import cors from 'cors';
import compareRouter from './routes/compare';
import authRouter from './routes/auth';
import lanesRouter from './routes/lanes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/lanes', lanesRouter);
app.use('/api/compare', compareRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
