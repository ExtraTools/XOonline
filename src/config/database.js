import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/dilauncher', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);

        // Обработка событий подключения
        mongoose.connection.on('connected', () => {
            console.log('✅ Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ Mongoose disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('🛑 Mongoose connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        // В production режиме используем встроенную базу данных
        if (process.env.NODE_ENV === 'production') {
            console.log('📦 Switching to in-memory database for production');
            // Здесь можно добавить логику для встроенной БД
        }
        process.exit(1);
    }
};

export default connectDB;