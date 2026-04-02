#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');

// --- РАСШИРЕННАЯ ПАЛИТРА ---
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m"
};

// --- ТЕМЫ ---
const Themes = {
    matrix: {
        name: "🌿 MATRIX",
        primary: C.green,
        secondary: C.brightGreen,
        accent: C.yellow,
        border: C.green,
        error: C.red,
        success: C.brightGreen,
        info: C.cyan,
        logo: `
${C.green}╔════════════════════╗
║  █████╗ ███╗   ██╗ ║
║ ██╔══██╗████╗  ██║ ║
║ ███████║██╔██╗ ██║ ║
║ ██╔══██║██║╚██╗██║ ║
║ ██║  ██║██║ ╚████║ ║
║ ╚═╝  ╚═╝╚═╝  ╚═══╝ ║
╚════════════════════╝
${C.dim}└── MATRIX EDITION ──┘${C.reset}`
    },
    robot: {
        name: "🤖 FSOCIETY",
        primary: C.red,
        secondary: C.brightRed,
        accent: C.brightYellow,
        border: C.red,
        error: C.brightRed,
        success: C.green,
        info: C.blue,
        logo: `
${C.red}╔════════════════════╗
║  ███████╗███████╗  ║
║  ██╔════╝██╔════╝  ║
║  █████╗  ███████╗  ║
║  ██╔══╝  ╚════██║  ║
║  ██║     ███████║  ║
║  ╚═╝     ╚══════╝  ║
╚════════════════════╝
${C.dim}└── FSOCIETY MODE ──┘${C.reset}`
    },
    ghost: {
        name: "👻 GHOST",
        primary: C.magenta,
        secondary: C.brightMagenta,
        accent: C.cyan,
        border: C.magenta,
        error: C.red,
        success: C.green,
        info: C.brightCyan,
        logo: `
${C.magenta}╔════════════════════╗
║  ██████╗ ██╗  ██╗ ║
║  ██╔════╝██║  ██║ ║
║  ██║     ███████║ ║
║  ██║     ██╔══██║ ║
║  ╚██████╗██║  ██║ ║
║   ╚═════╝╚═╝  ╚═╝ ║
╚════════════════════╝
${C.dim}└── GHOST MODE ────┘${C.reset}`
    }
};

let T = Themes.matrix;
let room = 'global';
let user = '';
let isAdmin = false;
let activeUsers = new Set(); // Хранилище активных ников

// --- ФУНКЦИИ ИНТЕРФЕЙСА ---
function drawHeader() {
    console.clear();
    console.log(T.logo);
    
    // Статус-бар
    const roleIcon = isAdmin ? '👑' : '👤';
    const roomIcon = '💬';
    const userIcon = '📝';
    
    console.log(`\n${T.border}┌────────────────────────┐${C.reset}`);
    console.log(`${T.border}│ ${roomIcon} ${T.primary}${room.padEnd(12)}${C.reset} ${userIcon} ${T.accent}${user.padEnd(8)}${C.reset} ${T.border}│`);
    console.log(`${T.border}│ ${roleIcon} ${isAdmin ? 'ADMIN' : 'USER'.padEnd(5)} ${T.dim}●${C.reset} ${T.secondary}${T.name.padEnd(12)}${C.reset} ${T.border}│`);
    console.log(`${T.border}└────────────────────────┘${C.reset}\n`);
}

function drawFullHelp() {
    console.log(`\n${T.accent}╔══════════════════════════════════════╗${C.reset}`);
    console.log(`${T.accent}║        📚 ALL COMMANDS LIST         ║${C.reset}`);
    console.log(`${T.accent}╚══════════════════════════════════════╝${C.reset}\n`);
    
    console.log(`${T.secondary}┌────────────────────────────────┐${C.reset}`);
    console.log(`${T.secondary}│ 💬 GENERAL COMMANDS            │${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/help${' '.repeat(8)}${C.reset}• Show this help menu     ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/nick [name]${' '.repeat(4)}${C.reset}• Change nickname         ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/theme [name]${' '.repeat(4)}${C.reset}• Change theme            ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/clear${' '.repeat(7)}${C.reset}• Clear screen            ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ 🏠 ROOM COMMANDS                │${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/room [name]${' '.repeat(4)}${C.reset}• Join room               ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/croom [name]${' '.repeat(3)}${C.reset}• Create room (admin)     ${T.secondary}│${C.reset}`);
    
    if (isAdmin) {
        console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
        console.log(`${T.secondary}│ 👑 ADMIN COMMANDS               │${C.reset}`);
        console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
        console.log(`${T.secondary}│ ${T.accent}/kick [user]${' '.repeat(4)}${C.reset}• Kick user               ${T.secondary}│${C.reset}`);
    }
    
    console.log(`${T.secondary}└────────────────────────────────┘${C.reset}\n`);
    
    console.log(`${T.info}💡 Available themes: ${T.accent}matrix${C.reset}, ${T.accent}robot${C.reset}, ${T.accent}ghost${C.reset}`);
    console.log(`${T.info}💬 Just type your message to chat\n${C.reset}`);
}

function displayMessage(sender, text, isOwn = false) {
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const shortText = text.length > 55 ? text.slice(0, 52) + '...' : text;
    
    if (isOwn) {
        console.log(`${C.dim}${time}${C.reset} ${T.accent}▶${C.reset} ${T.secondary}${sender}${C.reset}: ${T.primary}${shortText}${C.reset}`);
    } else {
        console.log(`${C.dim}${time}${C.reset} ${T.primary}◀${C.reset} ${T.primary}${sender}${C.reset}: ${T.secondary}${shortText}${C.reset}`);
    }
}

// --- ФУНКЦИЯ ВЫБОРА НИКА ---
async function chooseNickname() {
    return new Promise((resolve) => {
        console.clear();
        console.log(T.logo);
        console.log(`\n${T.accent}╔════════════════════════════╗${C.reset}`);
        console.log(`${T.accent}║   WELCOME TO ANONGRAM!   ║${C.reset}`);
        console.log(`${T.accent}╚════════════════════════════╝${C.reset}\n`);
        console.log(`${T.secondary}Choose your nickname:${C.reset}`);
        console.log(`${T.dim}(min 2 chars, max 15 chars)${C.reset}\n`);
        
        const askNick = () => {
            rl.question(`${T.accent}➤ ${C.reset}`, (nick) => {
                nick = nick.trim();
                
                if (!nick || nick.length < 2) {
                    console.log(`${T.error}✗ Nickname must be at least 2 characters${C.reset}`);
                    askNick();
                } else if (nick.length > 15) {
                    console.log(`${T.error}✗ Nickname too long (max 15 chars)${C.reset}`);
                    askNick();
                } else if (/[^\wа-яА-Я\-_]/.test(nick)) {
                    console.log(`${T.error}✗ Use only letters, numbers, - and _${C.reset}`);
                    askNick();
                } else {
                    resolve(nick);
                }
            });
        };
        
        askNick();
    });
}

// --- СЕТЬ С ПРОВЕРКОЙ УНИКАЛЬНОСТИ ---
const client = mqtt.connect('mqtt://broker.hivemq.com', {
    keepalive: 60,
    reconnectPeriod: 1000
});

client.on('connect', async () => {
    // Запрашиваем ник при подключении
    user = await chooseNickname();
    
    // Проверяем уникальность ника
    client.publish('anongram/v4/check_nick', JSON.stringify({ type: 'check', nick: user }));
    
    // Ждем ответ о уникальности
    setTimeout(() => {
        drawHeader();
        joinRoom('global');
        console.log(`${T.success}✓ Connected as ${T.accent}${user}${C.reset}`);
        drawFullHelp(); // Показываем все команды при старте
        setPrompt();
        rl.prompt();
    }, 500);
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        
        // Обработка проверки ника
        if (data.type === 'nick_check') {
            if (!data.available && data.nick === user) {
                console.log(`\n${T.error}✗ Nickname "${user}" is already taken!${C.reset}`);
                console.log(`${T.secondary}Please choose another one:${C.reset}`);
                chooseNickname().then(newNick => {
                    user = newNick;
                    drawHeader();
                    console.log(`${T.success}✓ Nickname changed to ${T.accent}${user}${C.reset}`);
                    setPrompt();
                    rl.prompt();
                });
            }
            return;
        }

        if (data.type === 'sys') {
            if (data.act === 'kick' && data.tgt === user) {
                console.log(`\n${T.error}⚠️  YOU WERE KICKED FROM ${room} ⚠️${C.reset}`);
                setTimeout(() => joinRoom('global'), 1500);
                return;
            }
            if (data.act === 'clr') { 
                drawHeader();
                console.log(`${T.success}✨ Screen cleared by admin${C.reset}`);
            }
            return;
        }

        if (data.type === 'msg' && data.u !== user) {
            process.stdout.write('\r\x1b[2K');
            displayMessage(data.u, data.t);
            rl.prompt(true);
        }
    } catch (e) {}
});

function joinRoom(name, admin = false) {
    if (room) client.unsubscribe(`anongram/v4/${room}`);
    room = name;
    isAdmin = admin;
    client.subscribe(`anongram/v4/${room}`);
    drawHeader();
    
    const roleText = admin ? `${T.accent}ADMIN${C.reset}` : `${T.secondary}USER${C.reset}`;
    console.log(`${T.success}✓ Joined "${T.primary}${room}${C.reset}" as ${roleText}${C.reset}`);
    setPrompt();
    rl.prompt();
}

// --- ИНТЕРФЕЙС ВВОДА ---
const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout,
    terminal: true
});

function setPrompt() {
    const promptSymbol = isAdmin ? `${T.accent}⚡${C.reset}` : `${T.secondary}➤${C.reset}`;
    rl.setPrompt(`${promptSymbol} `);
}

// --- ОБРАБОТКА КОМАНД ---
rl.on('line', (line) => {
    const input = line.trim();
    if (!input) { 
        rl.prompt(); 
        return; 
    }

    if (input.startsWith('/')) {
        const [cmd, ...args] = input.split(' ');
        
        switch(cmd) {
            case '/help':
                drawFullHelp();
                break;
                
            case '/croom':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /croom [room_name]${C.reset}`);
                } else {
                    joinRoom(args[0], true);
                }
                break;
                
            case '/room':
                joinRoom(args[0] || 'global', false);
                break;
                
            case '/nick':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /nick [new_nickname]${C.reset}`);
                } else if (args[0].length < 2) {
                    console.log(`${T.error}✗ Nickname must be at least 2 chars${C.reset}`);
                } else if (args[0].length > 15) {
                    console.log(`${T.error}✗ Nickname too long (max 15)${C.reset}`);
                } else {
                    const oldNick = user;
                    user = args[0];
                    
                    // Проверяем уникальность нового ника
                    client.publish('anongram/v4/check_nick', JSON.stringify({ type: 'check', nick: user }));
                    
                    drawHeader();
                    console.log(`${T.success}✓ Nickname changed: ${oldNick} → ${T.accent}${user}${C.reset}`);
                }
                break;
                
            case '/theme':
                if (!args[0]) {
                    console.log(`${T.secondary}Available themes: matrix, robot, ghost${C.reset}`);
                } else if (Themes[args[0]]) {
                    T = Themes[args[0]];
                    drawHeader();
                    console.log(`${T.success}✓ Theme changed to ${T.name}${C.reset}`);
                } else {
                    console.log(`${T.error}✗ Theme "${args[0]}" not found${C.reset}`);
                }
                break;
                
            case '/clear':
                if (isAdmin) {
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'clr'}));
                    console.log(`${T.success}✓ Screen cleared for all users${C.reset}`);
                } else {
                    drawHeader();
                    console.log(`${T.success}✓ Screen cleared${C.reset}`);
                }
                break;
                
            case '/kick':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /kick [username]${C.reset}`);
                } else if (isAdmin) {
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'kick', tgt: args[0]}));
                    console.log(`${T.success}✓ Kicked: ${args[0]}${C.reset}`);
                } else {
                    console.log(`${T.error}✗ Admin only command${C.reset}`);
                }
                break;
                
            default:
                console.log(`${T.error}✗ Unknown command. Type ${T.accent}/help${C.reset} for commands${C.reset}`);
                break;
        }
    } else {
        // Отправка сообщения
        const payload = { type: 'msg', u: user, t: input };
        client.publish(`anongram/v4/${room}`, JSON.stringify(payload));
        
        // Очистка и отображение
        process.stdout.write('\x1b[1A\x1b[2K');
        displayMessage(user, input, true);
    }
    
    setPrompt();
    rl.prompt();
});

// --- ОБРАБОТКА ВЫХОДА ---
process.on('SIGINT', () => {
    console.log(`\n${T.secondary}👋 Goodbye, ${user}!${C.reset}`);
    client.end();
    rl.close();
    process.exit(0);
});
