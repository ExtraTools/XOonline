// GameSession Model - DinoGames 2025

import { DataTypes } from 'sequelize';
import { sequelize } from '../init.js';

export const GameSession = sequelize.define('GameSession', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sessionId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'games',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    opponentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('waiting', 'active', 'completed', 'abandoned'),
        defaultValue: 'waiting'
    },
    result: {
        type: DataTypes.ENUM('win', 'lose', 'draw', null),
        defaultValue: null
    },
    score: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    gameData: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    startedAt: {
        type: DataTypes.DATE,
        defaultValue: null
    },
    completedAt: {
        type: DataTypes.DATE,
        defaultValue: null
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        comment: 'Длительность игры в секундах'
    }
}, {
    tableName: 'game_sessions',
    timestamps: true,
    hooks: {
        beforeUpdate: (session) => {
            // Автоматический расчёт длительности при завершении
            if (session.status === 'completed' && session.startedAt && !session.duration) {
                const duration = Math.floor((new Date() - new Date(session.startedAt)) / 1000);
                session.duration = duration;
                session.completedAt = new Date();
            }
        }
    }
}); 