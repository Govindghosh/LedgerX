import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { kafkaConfig } from '../config/kafka.config.js';

class KafkaService {
    private kafka: Kafka;
    private producer: Producer | null = null;
    private consumers: Map<string, Consumer> = new Map();
    private isConnected: boolean = false;

    constructor() {
        this.kafka = new Kafka({
            clientId: kafkaConfig.clientId,
            brokers: kafkaConfig.brokers,
            logLevel: logLevel.WARN,
            retry: {
                initialRetryTime: 100,
                retries: 8,
            },
        });
    }

    // Initialize producer
    async initProducer(): Promise<void> {
        try {
            this.producer = this.kafka.producer({
                allowAutoTopicCreation: true,
                transactionTimeout: 30000,
            });
            await this.producer.connect();
            this.isConnected = true;
            console.log('✅ Kafka Producer connected');
        } catch (error) {
            console.error('❌ Kafka Producer connection failed:', error);
            this.isConnected = false;
        }
    }

    // Create and connect a consumer
    async createConsumer(groupId: string): Promise<Consumer | null> {
        try {
            const consumer = this.kafka.consumer({
                groupId,
                sessionTimeout: 30000,
                heartbeatInterval: 3000,
            });
            await consumer.connect();
            this.consumers.set(groupId, consumer);
            console.log(`✅ Kafka Consumer [${groupId}] connected`);
            return consumer;
        } catch (error) {
            console.error(`❌ Kafka Consumer [${groupId}] connection failed:`, error);
            return null;
        }
    }

    // Send message to a topic
    async sendMessage(topic: string, message: object, key?: string): Promise<boolean> {
        if (!this.producer || !this.isConnected) {
            console.warn('⚠️ Kafka Producer not connected, message not sent');
            return false;
        }

        try {
            await this.producer.send({
                topic,
                messages: [
                    {
                        key: key || undefined,
                        value: JSON.stringify(message),
                        timestamp: Date.now().toString(),
                    },
                ],
            });
            return true;
        } catch (error) {
            console.error(`❌ Failed to send message to ${topic}:`, error);
            return false;
        }
    }

    // Send batch messages
    async sendBatchMessages(topic: string, messages: Array<{ key?: string; value: object }>): Promise<boolean> {
        if (!this.producer || !this.isConnected) {
            console.warn('⚠️ Kafka Producer not connected, messages not sent');
            return false;
        }

        try {
            await this.producer.send({
                topic,
                messages: messages.map(m => ({
                    key: m.key || undefined,
                    value: JSON.stringify(m.value),
                    timestamp: Date.now().toString(),
                })),
            });
            return true;
        } catch (error) {
            console.error(`❌ Failed to send batch messages to ${topic}:`, error);
            return false;
        }
    }

    // Subscribe consumer to topics
    async subscribeConsumer(
        groupId: string,
        topics: string[],
        messageHandler: (topic: string, partition: number, message: any) => Promise<void>
    ): Promise<void> {
        const consumer = this.consumers.get(groupId);
        if (!consumer) {
            console.error(`❌ Consumer [${groupId}] not found`);
            return;
        }

        try {
            for (const topic of topics) {
                await consumer.subscribe({ topic, fromBeginning: false });
            }

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const parsedMessage = message.value
                            ? JSON.parse(message.value.toString())
                            : null;
                        await messageHandler(topic, partition, parsedMessage);
                    } catch (error) {
                        console.error(`❌ Error processing message from ${topic}:`, error);
                    }
                },
            });

            console.log(`✅ Consumer [${groupId}] subscribed to: ${topics.join(', ')}`);
        } catch (error) {
            console.error(`❌ Failed to subscribe consumer [${groupId}]:`, error);
        }
    }

    // Disconnect all
    async disconnect(): Promise<void> {
        try {
            if (this.producer) {
                await this.producer.disconnect();
                console.log('🔌 Kafka Producer disconnected');
            }

            for (const [groupId, consumer] of this.consumers) {
                await consumer.disconnect();
                console.log(`🔌 Kafka Consumer [${groupId}] disconnected`);
            }

            this.consumers.clear();
            this.isConnected = false;
        } catch (error) {
            console.error('❌ Error disconnecting Kafka:', error);
        }
    }

    // Check connection status
    isProducerConnected(): boolean {
        return this.isConnected;
    }

    // Get admin client for topic management
    getAdmin() {
        return this.kafka.admin();
    }
}

// Singleton instance
export const kafkaService = new KafkaService();
