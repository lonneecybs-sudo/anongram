#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');

// --- ТЕМЫ ОФОРМЛЕНИЯ (Теперь с RESET и без ошибок) ---
const themes = {
    matrix: { main: "\x1b[32m", accent: "\x1b[1m", nick: "\x1b[36m", dim: "\x1b[90m", reset: "\x1b[0m" },
    blood:  { main: "\x1b[31m", accent: "\x1b[1m", nick: "\x1b[33m", dim: "\x1b[31m\x1b[2m", reset: "\x1b[0m" },
    ocean:  { main: "\x1b[34m", accent: "\x1b[36m", nick: "\x1b[37m", dim: "\x1b[90m", reset: "\x1b[0m" },
    gold:   { main: "\x1b[33m", accent: "\x1b[1m", nick: "\x1b[32m", dim: "\x1b[90m", reset: "\x1b[0m" }
};

let T = themes.matrix; // Тема по умолчанию
let currentRoom = 'global';
let username = 'anon' + crypto.randomBytes(2).toString('hex');
let isAdmin = false;
let history = [];

// --- ЛОГОТИП ---
const LOGO = (theme) => `${theme.main}${theme.accent}
  █████╗ ███╗   ██╗ ██████╗  
 ██╔══██╗████╗  ██║██╔═══██╗ 
 ███████║██╔██╗ ██║██║   ██║ 
 ██╔══██║██║╚██╗██║██║   ██║ 
 ██║  ██║██║ ╚████║╚██████╔╝ 
 ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ${theme.reset}`;

const getTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function updatePrompt() {
    const adminTag = isAdmin ? `[${T.main}ADMIN${T.reset}]` : '';
    // Убираем все возможные undefined, добавляя проверку
    const promptStr = `${T.dim}─${adminTag}─[${T.reset}${T.main}${username}${T.reset}${T.dim}]─( ${T.nick}${currentRoom}${T.reset}${T.dim} )\n${T.reset}${T.main}██>${T.reset} `;
    rl.setPrompt(promptStr);
}

const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
    console.clear();
    console.log(LOGO(T));
    console.log(`${T.main}>>> СЕТЬ ПОДКЛЮЧЕНА${T.reset}\n`);
    joinRoom('global');
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        if (data.type === 'system') {
            if (data.action === 'kick' && data.target === username) {
                console.log(`\n${T.main}!!! ВАС КИКНУЛ АДМИН !!!${T.reset}`);
                joinRoom('global');
            }
            if (data.action === 'clear') {
                console.clear();
                console.log(LOGO(T));
                console.log(`${T.main}--- Чат очищен админом ---${T.reset}`);
                history = [];
            }
            return;
        }

        if (data.type === 'chat' && data.user !== username) {
            process.stdout.write('\x1b[2K\x1b[0G'); 
            console.log(`${T.dim}${getTime()} ${T.nick}${data.user}${T.reset}: ${data.text}`);
            rl.prompt(true);
        }
    } catch (e) {}
});

function joinRoom(roomName, asAdmin = false) {
    if (currentRoom) client.unsubscribe(`anongram/rooms/${currentRoom}`);
    currentRoom = roomName;
    isAdmin = asAdmin;
    client.subscribe(`anongram/rooms/${currentRoom}`);
    
    console.clear();
    console.log(LOGO(T));
    console.log(`\n${T.main}[*] Вход в комнату: ${roomName.toUpperCase()}${T.reset}`);
    if (isAdmin) console.log(`${T.main}[!] Вы получили права АДМИНИСТРАТОРА${T.reset}`);
    
    updatePrompt();
    rl.prompt();
}

rl.on('line', (line) => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }

    if (text.startsWith('/')) {
        const [cmd, ...args] = text.split(' ');
        switch(cmd) {
            case '/croom':
                joinRoom(args[0] || 'private', true);
                break;
            case '/room':
                joinRoom(args[0] || 'global', false);
                break;
            case '/theme':
                if (themes[args[0]]) {
                    T = themes[args[0]];
                    console.clear(); console.log(LOGO(T));
                    console.log(`${T.main}Тема успешно изменена!${T.reset}`);
                } else {
                    console.log(`${T.main}Доступно: matrix, blood, ocean, gold${T.reset}`);
                }
                break;
            case '/kick':
                if (isAdmin && args[0]) {
                    client.publish(`anongram/rooms/${currentRoom}`, JSON.stringify({ type: 'system', action: 'kick', target: args[0] }));
                }
                break;
            case '/clear':
                if (isAdmin) {
                    client.publish(`anongram/rooms/${currentRoom}`, JSON.stringify({ type: 'system', action: 'clear' }));
                } else { console.clear(); console.log(LOGO(T)); }
                break;
            case '/nick':
                username = args[0] || username;
                break;
            case '/help':
                console.log(`\n${T.main}КОМАНДЫ:${T.reset}\n/croom [имя] - Создать комнату\n/room [имя] - Войти\n/theme [name] - Смена темы\n/nick [имя] - Смена ника\n/clear - Очистить\n`);
                break;
        }
    } else {
        const msg = { type: 'chat', user: username, text: text, time: getTime() };
        client.publish(`anongram/rooms/${currentRoom}`, JSON.stringify(msg));
        process.stdout.write('\x1b[1A\x1b[2K');
        console.log(`${T.dim}${getTime()} ${T.main}Я${T.reset}: ${text}`);
    }
    updatePrompt();
    rl.prompt();
});
