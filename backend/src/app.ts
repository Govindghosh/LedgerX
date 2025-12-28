import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { startCrons } from './cron';

const app = express();

app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true,
}));

app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/v1', routes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling
app.use(errorHandler);

// Database connection & Server start
mongoose.connect(config.MONGO_URI, { dbName: config.MONGO_DB })
    .then(() => {
        console.log('Connected to MongoDB');
        startCrons();
        app.listen(config.PORT, () => {
            console.log(`Server running on port ${config.PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });

export default app;
