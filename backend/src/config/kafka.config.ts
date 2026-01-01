import { config } from './index.js';

export const kafkaConfig = {
    clientId: 'ledgerx-backend',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),

    // Topic names
    topics: {
        NOTIFICATIONS: 'notifications',
        CHAT_DIRECT: 'chat.direct',
        CHAT_GROUP: 'chat.group',
        CHAT_PRESENCE: 'chat.presence',
    },

    // Consumer group IDs
    consumerGroups: {
        NOTIFICATION_PROCESSOR: 'notification-processor',
        CHAT_PROCESSOR: 'chat-processor',
    }
};

export const socketConfig = {
    cors: {
        origin: [config.FRONTEND_URL || 'http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
};
