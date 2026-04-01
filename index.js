#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.anongram');
const configFile = path.join(configDir, 'config.json');

if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

function startBot(token, adminId) {
    const bot = new TelegramBot(token, { polling: true });
    console.log(`🚀 Anongram запущен! Админ ID: ${adminId}`);

    // Простейшая база данных пользователей (в памяти)
    const users = new Set();

    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!users.has(chatId)) users.add(chatId);

        // Команды для админа
        if (chatId == adminId) {
            if (text.startsWith('/broadcast ')) {
                const message = text.replace('/broadcast ', '');
                users.forEach(user => {
                    bot.sendMessage(user, `📢 ОБЪЯВЛЕНИЕ: ${message}`);
                });
                return bot.sendMessage(adminId, `✅ Разослано ${users.size} пользователям.`);
            }
            
            if (text === '/stats') {
                return bot.sendMessage(adminId, `📊 Пользователей в базе: ${users.size}`);
            }
        }

        // Логика обычного пользователя
        if (text === '/start') {
            bot.sendMessage(chatId, 'Привет! Это анонимный бот. Напиши что-нибудь.');
        } else {
            bot.sendMessage(chatId, `Анонимный ответ: ${text.split('').reverse().join('')}`);
        }
    });

    bot.on('error', (err) => console.log('Ошибка:', err.message));
}

// Проверка конфига
if (fs.existsSync(configFile)) {
    const config = JSON.parse(fs.readFileSync(configFile));
    startBot(config.token, config.adminId);
} else {
    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    
    console.log('--- Первая настройка Anongram ---');
    readline.question('1. Вставь TOKEN бота: ', (token) => {
        readline.question('2. Вставь свой Telegram ID (админ): ', (adminId) => {
            fs.writeFileSync(configFile, JSON.stringify({ 
                token: token.trim(), 
                adminId: adminId.trim() 
            }, null, 2));
            console.log('✅ Данные сохранены в ~/.anongram/config.json');
            readline.close();
            startBot(token.trim(), adminId.trim());
        });
    });
}
