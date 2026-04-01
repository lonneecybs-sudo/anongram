#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Путь к конфигу в домашней папке пользователя
const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.anongram');
const configFile = path.join(configDir, 'config.json');

// Проверяем папку
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);

// Функция для запуска бота
function startBot(token) {
    const bot = new TelegramBot(token, { polling: true });
    console.log('🚀 Anongram запущен! Напиши что-нибудь боту.');
    
    bot.on('message', (msg) => {
        bot.sendMessage(msg.chat.id, `Бот работает! Твой ID: ${msg.chat.id}`);
    });

    bot.on('error', (err) => {
        console.error('❌ Ошибка токена! Удали ~/.anongram/config.json и введи заново.');
        process.exit(1);
    });
}

// Проверяем, есть ли токен
if (fs.existsSync(configFile)) {
    const config = JSON.parse(fs.readFileSync(configFile));
    startBot(config.token);
} else {
    // Если токена нет, просим ввести его через терминал
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('--- Настройка Anongram ---');
    readline.question('Вставь токен своего бота: ', (token) => {
        fs.writeFileSync(configFile, JSON.stringify({ token: token.trim() }));
        console.log('✅ Токен сохранен в ~/.anongram/config.json');
        readline.close();
        startBot(token.trim());
    });
}
