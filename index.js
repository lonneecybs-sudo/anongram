#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.anongram');
const configFile = path.join(configDir, 'config.json');

// Создаем папку если нет
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

function startBot(token, adminId) {
    const bot = new TelegramBot(token, { polling: true });
    const dbFile = path.join(configDir, 'users.json');
    
    // Загрузка базы пользователей
    let users = [];
    if (fs.existsSync(dbFile)) users = JSON.parse(fs.readFileSync(dbFile));

    console.log(`\n🚀 Anongram запущен!\nАдмин ID: ${adminId}\nКоманда: anongram`);

    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!users.includes(chatId)) {
            users.push(chatId);
            fs.writeFileSync(dbFile, JSON.stringify(users));
        }

        // --- БЛОК АДМИНА ---
        if (chatId == adminId) {
            if (text === '/stats') {
                return bot.sendMessage(adminId, `📊 Пользователей в базе: ${users.length}`);
            }
            if (text.startsWith('/broadcast ')) {
                const broadcastText = text.replace('/broadcast ', '');
                users.forEach(id => {
                    bot.sendMessage(id, `📢 Сообщение от админа:\n\n${broadcastText}`);
                });
                return bot.sendMessage(adminId, `✅ Разослано ${users.length} юзерам.`);
            }
        }

        // --- БЛОК ЮЗЕРА ---
        if (text === '/start') {
            bot.sendMessage(chatId, '🕵️ Добро пожаловать в анонимный чат!');
        } else {
            // Эхо-ответ или твоя логика анонимности
            bot.sendMessage(chatId, `Сообщение получено анонимно.`);
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
    console.log('\n🔧 ПЕРВАЯ НАСТРОЙКА ANONGRAM');
    readline.question('Введите токен бота: ', (token) => {
        readline.question('Введите ваш Telegram ID: ', (adminId) => {
            fs.writeFileSync(configFile, JSON.stringify({ token: token.trim(), adminId: adminId.trim() }, null, 2));
            console.log('✅ Настройка завершена! Запускаю...');
            readline.close();
            startBot(token.trim(), adminId.trim());
        });
    });
}
