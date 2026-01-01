import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../config/index.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

const demoData = {
    admin: {
        name: 'System Admin',
        email: 'admin@test.com',
        password: 'Admin@123',
        role: 'ADMIN',
    },
    users: [
        {
            name: 'Demo User 1',
            email: 'user1@test.com',
            password: 'User@123',
            role: 'USER',
        },
        {
            name: 'Demo User 2',
            email: 'user2@test.com',
            password: 'User@123',
            role: 'USER',
        }
    ]
};

async function seed() {
    try {
        console.log('🌱 Starting database seeding...');
        await mongoose.connect(config.MONGO_URI, { dbName: config.MONGO_DB });

        // Check if admin exists
        const adminExists = await User.findOne({ email: demoData.admin.email });
        if (!adminExists) {
            console.log('👤 Creating admin user...');
            const hashedPassword = await bcrypt.hash(demoData.admin.password, 10);
            const admin = await User.create({
                name: demoData.admin.name,
                email: demoData.admin.email,
                passwordHash: hashedPassword,
                role: demoData.admin.role,
                isActive: true
            });

            // Create admin wallet
            await Wallet.create({
                userId: admin._id,
                balance: 1000000,
                currency: 'USD'
            });
            console.log('✅ Admin created successfully.');
        } else {
            console.log('ℹ️ Admin already exists, skipping.');
        }

        // Create demo users
        for (const userData of demoData.users) {
            const userExists = await User.findOne({ email: userData.email });
            if (!userExists) {
                console.log(`👤 Creating ${userData.name}...`);
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                const user = await User.create({
                    name: userData.name,
                    email: userData.email,
                    passwordHash: hashedPassword,
                    role: userData.role,
                    isActive: true
                });

                // Create user wallet
                await Wallet.create({
                    userId: user._id,
                    balance: 1000,
                    currency: 'USD'
                });
                console.log(`✅ ${userData.name} created successfully.`);
            }
        }

        console.log('🏁 Seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
