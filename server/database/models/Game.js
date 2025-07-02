// Game Model - DinoGames 2025

import { DataTypes } from 'sequelize';
import { sequelize } from '../init.js';

export const Game = sequelize.define('Game', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    minPlayers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2
    },
    maxPlayers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2
    },
    estimatedTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
        comment: 'Примерное время игры в минутах'
    },
    rules: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'games',
    timestamps: true
}); 