// User Model - DinoGames 2025

import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../init.js';

export const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 50],
            isAlphanumeric: {
                msg: 'Имя пользователя может содержать только буквы и цифры'
            }
        }
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                msg: 'Неверный формат email'
            }
        }
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            len: {
                args: [6, 100],
                msg: 'Пароль должен быть не менее 6 символов'
            }
        }
    },
    avatar: {
        type: DataTypes.STRING(255),
        defaultValue: null
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        defaultValue: null
    },
    registrationIp: {
        type: DataTypes.STRING(45),
        defaultValue: null
    }
}, {
    tableName: 'users',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Методы экземпляра
User.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    delete values.registrationIp;
    return values;
};

// Статические методы
User.findByEmail = async function(email) {
    return this.findOne({ where: { email } });
};

User.findByUsername = async function(username) {
    return this.findOne({ where: { username } });
}; 