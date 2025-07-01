// PlayerStats Model - DinoGames 2025

import { DataTypes } from 'sequelize';
import { sequelize } from '../init.js';

export const PlayerStats = sequelize.define('PlayerStats', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    totalGames: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    draws: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    winRate: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Процент побед'
    },
    totalPlayTime: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Общее время игры в секундах'
    },
    rating: {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
        comment: 'ELO рейтинг'
    },
    highestRating: {
        type: DataTypes.INTEGER,
        defaultValue: 1000
    },
    currentStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Текущая серия побед'
    },
    bestStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Лучшая серия побед'
    },
    favoriteGame: {
        type: DataTypes.STRING(50),
        defaultValue: null
    },
    achievements: {
        type: DataTypes.JSON,
        defaultValue: []
    }
}, {
    tableName: 'player_stats',
    timestamps: true,
    hooks: {
        beforeUpdate: (stats) => {
            // Автоматический пересчёт винрейта
            if (stats.totalGames > 0) {
                stats.winRate = (stats.wins / stats.totalGames) * 100;
            }
            
            // Обновление максимального рейтинга
            if (stats.rating > stats.highestRating) {
                stats.highestRating = stats.rating;
            }
        }
    }
});

// Методы для обновления статистики
PlayerStats.prototype.recordWin = async function() {
    this.wins += 1;
    this.totalGames += 1;
    this.currentStreak += 1;
    
    if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
    }
    
    await this.save();
};

PlayerStats.prototype.recordLoss = async function() {
    this.losses += 1;
    this.totalGames += 1;
    this.currentStreak = 0;
    await this.save();
};

PlayerStats.prototype.recordDraw = async function() {
    this.draws += 1;
    this.totalGames += 1;
    this.currentStreak = 0;
    await this.save();
}; 