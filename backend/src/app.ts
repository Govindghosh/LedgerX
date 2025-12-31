import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import routes from './routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { startCrons } from './cron/index.js';
import { socketService } from './services/socket.service.js';
import { kafkaService } from './services/kafka.service.js';
import { kafkaConfig } from './config/kafka.config.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
socketService.initialize(httpServer);

app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true,
}));

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/v1', routes);

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        kafka: kafkaService.isProducerConnected() ? 'connected' : 'disconnected',
        onlineUsers: socketService.getOnlineUsersCount(),
    });
});

// Error handling
app.use(errorHandler);

// Initialize Kafka
const initializeKafka = async () => {
    try {
        await kafkaService.initProducer();

        // Create notification consumer
        const notificationConsumer = await kafkaService.createConsumer(
            kafkaConfig.consumerGroups.NOTIFICATION_PROCESSOR
        );

        if (notificationConsumer) {
            await kafkaService.subscribeConsumer(
                kafkaConfig.consumerGroups.NOTIFICATION_PROCESSOR,
                [kafkaConfig.topics.NOTIFICATIONS],
                async (topic, partition, message) => {
                    console.log(`📨 Processing notification: ${JSON.stringify(message)}`);
                    // Additional notification processing logic can go here
                    // e.g., send emails, push notifications, etc.
                }
            );
        }

        // Create chat consumer
        const chatConsumer = await kafkaService.createConsumer(
            kafkaConfig.consumerGroups.CHAT_PROCESSOR
        );

        if (chatConsumer) {
            await kafkaService.subscribeConsumer(
                kafkaConfig.consumerGroups.CHAT_PROCESSOR,
                [kafkaConfig.topics.CHAT_DIRECT, kafkaConfig.topics.CHAT_GROUP],
                async (topic, partition, message) => {
                    console.log(`💬 Processing chat message from ${topic}: ${JSON.stringify(message)}`);
                    // Additional chat processing logic can go here
                    // e.g., message analytics, moderation, etc.
                }
            );
        }
    } catch (error) {
        console.error('❌ Kafka initialization failed:', error);
        console.log('⚠️ Application will continue without Kafka. Real-time features may be limited.');
    }
};

// Database connection & Server start
mongoose.connect(config.MONGO_URI, { dbName: config.MONGO_DB })
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        // Initialize Kafka (non-blocking)
        initializeKafka();

        startCrons();

        httpServer.listen(config.PORT, () => {
            console.log(`🚀 Server running on port ${config.PORT}`);
            console.log(`🔌 WebSocket server ready`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    await kafkaService.disconnect();
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export default app;
