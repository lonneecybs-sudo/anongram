#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');

// --- КОНФИГУРАЦИЯ ЦВЕТОВ ---
const C = {
    res: "\x1b[0m",
    b: "\x1b[1m",
    d: "\x1b[2m",
    // Цвета тем
    matrix: { main: "\x1b[32m", sec: "\x1b[36m", err: "\x1b[31m" },
    fsociety: { main: "\x1b[31m", sec: "\x1b[37m", err: "\x1b[33m" },
    hack: { main: "\x1b[37m", sec: "\x1b[90m", err: "\x1b[31m" }
};

let T = C.matrix; // По умолчанию Matrix
let currentRoom = 'global';
let username = 'anon_' + crypto.randomBytes(2).toString('hex');
let isAdmin = false;

// --- ИНТЕРФЕЙСНЫЕ МОДУЛИ ---
const LOGO = `
   ▄▄▄▄▀ ▄  █ ▄███▄      ▄     ▄▄▄▄▀ █▄▄▄▄ ▄███▄   █▀▄▀█ 
▀▀▀ █   █   █ █▀   ▀      █ ▀▀▀ █    █  ▄▀ █▀   ▀  █ █ █ 
    █   ██▀▀█ ██▄▄    ██   █    █    █▀▀▌  ██▄▄    █ ▄ █ 
   █    █   █ █▄   ▄▀ █ █  █   █     █  █  █▄   ▄  █   █ 
  ▀    Manual ▀███▀   █  █ █  ▀        █   ▀███▀      █  
                      █   ██      Anongram v3.5    ▀   `;

function drawHeader() {
    console.clear();
    console.log(`${T.main}${LOGO}${C.res}`);
    const status = isAdmin ? "PRIVILEGED / ADMIN" : "STANDARD / USER";
    console.log(`${C.b}${T.main}┌──────────────────────────────────────────────────────────┐${C.res}`);
    console.log(`${C.b}${T.main}│${C.res}  ${C.b}IDENTITY:${C.res} ${T.sec}${username.padEnd(12)}${C.res} ${C.b}ROOM:${C.res} ${T.sec}${currentRoom.padEnd(12)}${C.res} ${C.b}STATUS:${C.res} ${T.main}${status.padEnd(18)}${C.res}${C.b}${T.main}│${C.res}`);
    console.log(`${C.b}${T.main}└──────────────────────────────────────────────────────────┘${C.res}`);
    console.log(`${C.d} Введите /help для вывода списка доступных протоколов${C.res}\n`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function updatePrompt() {
    const symbol = isAdmin ? "ROOT#" : ">>";
    rl.setPrompt(`${C.b}${T.main}${username}${C.res}${T.sec}@${currentRoom}${C.res} ${C.b}${symbol}${C.res} `);
}

// --- СЕТЕВАЯ ЧАСТЬ ---
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
    drawHeader();
    updatePrompt();
    joinRoom('global');
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        if (data.type === 'system') {
            if (data.action === 'kick' && data.target === username) {
                console.log(`\n${C.b}${T.err}[ СИСТЕМА ] Вы были принудительно отключены админом.${C.res}`);
                return joinRoom('global');
            }
            if (data.action === 'clear') {
                drawHeader();
                console.log(`${T.main}[ СИСТЕМА ] Буфер сообщений очищен.${C.res}`);
            }
            return;
        }

        if (data.type === 'chat' && data.user !== username) {
            process.stdout.write('\x1b[2K\x1b[0G'); 
            const time = new Date().toLocaleTimeString().slice(0, 5);
            console.log(`${C.d}[${time}]${C.res} ${T.main}${data.user.padStart(10)}${C.res} ${C.b}${T.sec}>>${C.res} ${data.text}`);
            rl.prompt(true);
        }
    } catch (e) {}
});

function joinRoom(room, asAdmin = false) {
    if (currentRoom) client.unsubscribe(`anongram/v3/${currentRoom}`);
    currentRoom = room;
    isAdmin = asAdmin;
    client.subscribe(`anongram/v3/${currentRoom}`);
    drawHeader();
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
            case '/help':
                console.log(`\n${C.b}ДОСТУПНЫЕ ПРОТОКОЛЫ:${C.res}`);
                console.log(`  ${T.main}/croom [name]${C.res} - Инициализировать защищенный канал (Admin)`);
                console.log(`  ${T.main}/room [name]${C.res}  - Подключиться к каналу`);
                console.log(`  ${T.main}/nick [name]${C.res}  - Изменить цифровой идентификатор`);
                console.log(`  ${T.main}/theme [name]${C.res} - Сменить визуальный интерфейс (matrix/fsociety/hack)`);
                console.log(`  ${T.main}/clear${C.res}        - Сброс терминала`);
                if (isAdmin) console.log(`  ${T.err}/kick [nick]${C.res}   - Разорвать соединение пользователя с каналом`);
                console.log("");
                break;
            case '/croom': joinRoom(args[0] || 'private', true); break;
            case '/room': joinRoom(args[0] || 'global', false); break;
            case '/theme':
                if (C[args[0]]) { T = C[args[0]]; drawHeader(); }
                break;
            case '/nick': username = args[0] || username; drawHeader(); break;
            case '/clear':
                if (isAdmin) client.publish(`anongram/v3/${currentRoom}`, JSON.stringify({type:'system', action:'clear'}));
                else drawHeader();
                break;
            case '/kick':
                if (isAdmin) client.publish(`anongram/v3/${currentRoom}`, JSON.stringify({type:'system', action:'kick', target: args[0]}));
                break;
        }
    } else {
        const msg = { type: 'chat', user: username, text: text };
        client.publish(`anongram/v3/${currentRoom}`, JSON.stringify(msg));
        process.stdout.write('\x1b[1A\x1b[2K');
        const time = new Date().toLocaleTimeString().slice(0, 5);
        console.log(`${C.d}[${time}]${C.res} ${T.main}${"Я".padStart(10)}${C.res} ${C.b}${T.sec}>>${C.res} ${text}`);
    }
    updatePrompt();
    rl.prompt();
});
