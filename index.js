#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');

// Настройки сети
const BROKER = 'mqtt://broker.hivemq.com'; // Публичный ретранслятор сообщений
let room = 'global';
// Генерируем случайный анонимный ник при входе
let username = 'Anon_' + crypto.randomBytes(2).toString('hex');

// Настройка интерфейса командной строки
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32m>\x1b[0m '
});

console.clear();
console.log('\x1b[36m%s\x1b[0m', '=========================================');
console.log('\x1b[36m%s\x1b[0m', ' 🕵️  ANONGRAM: Независимый Терминал-Чат');
console.log('\x1b[36m%s\x1b[0m', '=========================================');
console.log('\x1b[33mПодключение к P2P узлу...\x1b[0m');

// Подключаемся к брокеру
const client = mqtt.connect(BROKER);

client.on('connect', () => {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    console.log('\x1b[32m[+] Успешное соединение с сетью!\x1b[0m');
    joinRoom(room);
});

function joinRoom(newRoom) {
    if (room) client.unsubscribe(`anongram_net/${room}`);
    room = newRoom;
    client.subscribe(`anongram_net/${room}`);
    console.log(`\n\x1b[35m[КАНАЛ]\x1b[0m Вы вошли в секретную комнату: \x1b[1m${room}\x1b[0m`);
    console.log(`\x1b[35m[ИНФО]\x1b[0m Ваш текущий позывной: \x1b[1m${username}\x1b[0m`);
    console.log('\x1b[90mВведите /help для списка команд.\x1b[0m\n');
    rl.prompt();
}

// Прием входящих сообщений
client.on('message', (topic, message) => {
    try {
        const msg = JSON.parse(message.toString());
        // Не дублируем свои же сообщения
        if (msg.user !== username) {
            // Очищаем текущую строку ввода, чтобы сообщение не ломало текст
            process.stdout.write('\x1b[2K\x1b[0G'); 
            console.log(`\x1b[36m[${msg.user}]\x1b[0m: ${msg.text}`);
            rl.prompt();
        }
    } catch (e) {
        // Игнорируем битые пакеты
    }
});

// Обработка ввода с клавиатуры
rl.on('line', (line) => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }

    // Проверка на команды
    if (text.startsWith('/')) {
        const args = text.split(' ');
        const cmd = args[0].toLowerCase();

        switch(cmd) {
            case '/help':
                console.log('\n\x1b[33m--- Доступные команды ---\x1b[0m');
                console.log('\x1b[32m/nick [имя]\x1b[0m - сменить свой позывной');
                console.log('\x1b[32m/room [имя]\x1b[0m - перейти в другую комнату (создать приватный канал)');
                console.log('\x1b[32m/clear\x1b[0m      - очистить историю на экране');
                console.log('\x1b[32m/exit\x1b[0m       - выйти из сети\n');
                break;
            case '/nick':
                if (args[1]) {
                    username = args[1];
                    console.log(`\x1b[32m[+] Позывной изменен на: ${username}\x1b[0m`);
                } else {
                    console.log('\x1b[31m[-] Ошибка: укажите имя (например: /nick Hacker)\x1b[0m');
                }
                break;
            case '/room':
                if (args[1]) {
                    joinRoom(args[1]);
                } else {
                    console.log('\x1b[31m[-] Ошибка: укажите комнату (например: /room darknet)\x1b[0m');
                }
                break;
            case '/clear':
                console.clear();
                break;
            case '/exit':
                console.log('\x1b[31mОтключение...\x1b[0m');
                process.exit(0);
                break;
            default:
                console.log('\x1b[31m[-] Неизвестная команда. Введите /help\x1b[0m');
        }
    } else {
        // Отправка текстового сообщения в сеть
        const payload = JSON.stringify({ user: username, text: text });
        client.publish(`anongram_net/${room}`, payload);
        
        // Рисуем свое сообщение
        process.stdout.write('\x1b[1A\x1b[2K'); // Удаляем введенную строку
        console.log(`\x1b[90m[Вы]\x1b[0m: ${text}`);
    }
    rl.prompt();
});

client.on('error', (err) => {
    console.error('\n\x1b[31m[!] Ошибка сети:\x1b[0m', err.message);
    process.exit(1);
});
