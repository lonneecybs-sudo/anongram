#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');

// --- ИНИЦИАЛИЗАЦИЯ ---
const BROKER = 'mqtt://broker.hivemq.com';
let currentRoom = 'global';
let username = 'anon' + crypto.randomBytes(2).toString('hex');
let isAdmin = false;
let roomOwner = '';
let history = []; // Храним последние 20 сообщений

// --- ТЕМЫ ОФОРМЛЕНИЯ ---
const themes = {
    matrix: { main: "\x1b[32m", accent: "\x1b[1m", nick: "\x1b[36m", dim: "\x1b[90m" },
    blood:  { main: "\x1b[31m", accent: "\x1b[1m", nick: "\x1b[33m", dim: "\x1b[31m\x1b[2m" },
    ocean:  { main: "\x1b[34m", accent: "\x1b[36m", nick: "\x1b[37m", dim: "\x1b[90m" },
    gold:   { main: "\x1b[33m", accent: "\x1b[1m", nick: "\x1b[32m", dim: "\x1b[90m" }
};
let T = themes.matrix;

const LOGO = (theme) => `${theme.main}${theme.accent}
  █████╗ ███╗   ██╗ ██████╗  
 ██╔══██╗████╗  ██║██╔═══██╗ 
 ███████║██╔██╗ ██║██║   ██║ 
 ██╔══██║██║╚██╗██║██║   ██║ 
 ██║  ██║██║ ╚████║╚██████╔╝ 
 ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ${theme.reset}`;

// --- ХЕЛПЕРЫ ---
const getTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function updatePrompt() {
    const adminTag = isAdmin ? `[${T.main}ADMIN${T.reset}]` : '';
    rl.setPrompt(`${T.dim}─${adminTag}─[${T.reset}${T.main}${username}${T.reset}${T.dim}]─( ${T.nick}${currentRoom}${T.reset}${T.dim} )\n${T.reset}${T.main}██>${T.reset} `);
}

// --- СЕТЕВАЯ ЛОГИКА ---
const client = mqtt.connect(BROKER);

client.on('connect', () => {
    console.clear();
    console.log(LOGO(T));
    console.log(`${T.main}>>> СЕТЬ ПОДКЛЮЧЕНА${T.reset}\n`);
    joinRoom('global');
});

// Слушаем сообщения
client.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());

    // Обработка истории (синхронизация)
    if (data.type === 'history_sync' && currentRoom === data.room && history.length === 0) {
        history = data.content;
        history.forEach(msg => console.log(`${T.dim}${msg.time} ${T.nick}${msg.user}${T.reset}: ${msg.text}`));
        rl.prompt(true);
    }

    // Служебные команды (Кик, Очистка)
    if (data.type === 'system') {
        if (data.action === 'kick' && data.target === username) {
            console.log(`\n${T.blood}!!! ВАС КИКНУЛ АДМИН !!!${T.reset}`);
            joinRoom('global');
        }
        if (data.action === 'clear') {
            console.clear();
            console.log(`${T.main}--- Комната очищена админом ---${T.reset}`);
            history = [];
        }
        return;
    }

    // Обычные сообщения
    if (data.type === 'chat' && data.user !== username) {
        process.stdout.write('\x1b[2K\x1b[0G'); 
        console.log(`${T.dim}${getTime()} ${T.nick}${data.user}${T.reset}: ${data.text}`);
        
        // Добавляем в локальную историю
        history.push({ time: getTime(), user: data.user, text: data.text });
        if (history.length > 20) history.shift();
        
        rl.prompt(true);
    }
});

function joinRoom(roomName, asAdmin = false) {
    if (currentRoom) client.unsubscribe(`anongram/rooms/${currentRoom}`);
    
    currentRoom = roomName;
    isAdmin = asAdmin;
    history = [];
    
    client.subscribe(`anongram/rooms/${currentRoom}`);
    
    console.clear();
    console.log(LOGO(T));
    console.log(`\n${T.main}[*] Вход в комнату: ${roomName.toUpperCase()}${T.reset}`);
    if (isAdmin) console.log(`${T.main}[!] Вы получили права АДМИНИСТРАТОРА${T.reset}`);
    
    // Запрос истории у тех, кто уже в комнате
    client.publish(`anongram/rooms/${currentRoom}/req`, JSON.stringify({ type: 'history_req' }));
    
    updatePrompt();
    rl.prompt();
}

// --- ОБРАБОТКА КОМАНД ---
rl.on('line', (line) => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }

    if (text.startsWith('/')) {
        const [cmd, ...args] = text.split(' ');
        switch(cmd) {
            case '/croom': // Создать комнату (стать админом)
                joinRoom(args[0] || 'private', true);
                break;
            case '/room': // Просто зайти
                joinRoom(args[0] || 'global', false);
                break;
            case '/theme':
                if (themes[args[0]]) {
                    T = themes[args[0]];
                    console.clear(); console.log(LOGO(T));
                    console.log(`${T.main}Тема изменена!${T.reset}`);
                } else { console.log("Доступны: matrix, blood, ocean, gold"); }
                break;
            case '/kick':
                if (isAdmin) {
                    client.publish(`anongram/rooms/${currentRoom}`, JSON.stringify({ type: 'system', action: 'kick', target: args[0] }));
                } else { console.log("Только для админов!"); }
                break;
            case '/clear':
                if (isAdmin) {
                    client.publish(`anongram/rooms/${currentRoom}`, JSON.stringify({ type: 'system', action: 'clear' }));
                } else { console.clear(); console.log(LOGO(T)); }
                break;
            case '/nick':
                username = args[0] || username;
                updatePrompt();
                break;
            case '/help':
                console.log("\n/croom [имя] - Создать (Админ)\n/room [имя] - Войти\n/theme [name] - Сменить тему\n/kick [ник] - Выгнать (Админ)\n/clear - Очистить чат\n/nick [имя] - Сменить ник\n");
                break;
            default: console.log("Неизвестная команда. /help");
        }
    } else {
        const msg = { type: 'chat', user: username, text: text, time: getTime() };
        client.publish(`anongram/rooms/${currentRoom}`, JSON.stringify(msg), { retain: true });
        
        // Сдвигаем курсор и пишем свое
        process.stdout.write('\x1b[1A\x1b[2K');
        console.log(`${T.dim}${getTime()} ${T.main}Я${T.reset}: ${text}`);
    }
    updatePrompt();
    rl.prompt();
});
