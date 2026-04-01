#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');

// --- РАСШИРЕННАЯ ПАЛИТРА С ВЕРТИКАЛЬНОЙ ОПТИМИЗАЦИЕЙ ---
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    
    // Основные цвета
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    
    // Яркие версии
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m"
};

// --- ВЕРТИКАЛЬНЫЕ ТЕМЫ (компактные, но стильные) ---
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
    },
    sunset: {
        name: "🌅 SUNSET",
        primary: C.brightYellow,
        secondary: C.brightRed,
        accent: C.brightMagenta,
        border: C.yellow,
        error: C.red,
        success: C.green,
        info: C.cyan,
        logo: `
${C.brightYellow}╔════════════════════╗
║  ☀️  ANONGRAM  🌙  ║
║  ┌────────────┐   ║
║  │  SUNSET    │   ║
║  │  EDITION   │   ║
║  └────────────┘   ║
║  ✨ v4.0 ✨       ║
╚════════════════════╝
${C.dim}└── SUNSET MODE ───┘${C.reset}`
    }
};

let T = Themes.matrix;
let room = 'global';
let user = '👤' + crypto.randomBytes(1).toString('hex');
let isAdmin = false;
let lastMessages = [];

// --- КОМПАКТНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА ---
function drawCompactHeader() {
    console.clear();
    console.log(T.logo);
    
    // Статус-бар в одну строку
    const roleIcon = isAdmin ? '👑' : '👤';
    const roomIcon = '💬';
    const userIcon = '📝';
    
    console.log(`\n${T.border}┌────────────────────────┐${C.reset}`);
    console.log(`${T.border}│ ${roomIcon} ${T.primary}${room.padEnd(12)}${C.reset} ${userIcon} ${T.accent}${user.padEnd(8)}${C.reset} ${T.border}│`);
    console.log(`${T.border}│ ${roleIcon} ${isAdmin ? 'ADMIN' : 'USER'.padEnd(5)} ${T.dim}●${C.reset} ${T.secondary}${T.name.padEnd(12)}${C.reset} ${T.border}│`);
    console.log(`${T.border}└────────────────────────┘${C.reset}\n`);
}

function drawMiniHelp() {
    console.log(`\n${T.accent}╔══════════════════════╗${C.reset}`);
    console.log(`${T.accent}║  📚 QUICK COMMANDS  ║${C.reset}`);
    console.log(`${T.accent}╚══════════════════════╝${C.reset}\n`);
    
    console.log(`${T.secondary}┌────────────────────┐${C.reset}`);
    console.log(`${T.secondary}│ 💬 GENERAL         │${C.reset}`);
    console.log(`${T.secondary}├────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ /help    • help    │${C.reset}`);
    console.log(`${T.secondary}│ /nick    • name    │${C.reset}`);
    console.log(`${T.secondary}│ /theme   • style   │${C.reset}`);
    console.log(`${T.secondary}│ /clear   • clean   │${C.reset}`);
    console.log(`${T.secondary}├────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ 🏠 ROOMS           │${C.reset}`);
    console.log(`${T.secondary}├────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ /room    • join    │${C.reset}`);
    console.log(`${T.secondary}│ /croom   • create  │${C.reset}`);
    
    if (isAdmin) {
        console.log(`${T.secondary}├────────────────────┤${C.reset}`);
        console.log(`${T.secondary}│ 👑 ADMIN           │${C.reset}`);
        console.log(`${T.secondary}├────────────────────┤${C.reset}`);
        console.log(`${T.secondary}│ /kick    • kick    │${C.reset}`);
    }
    
    console.log(`${T.secondary}└────────────────────┘${C.reset}\n`);
    console.log(`${T.info}💡 Type message to chat${C.reset}\n`);
}

function displayMessage(sender, text, isOwn = false) {
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    if (isOwn) {
        console.log(`${C.dim}${time}${C.reset} ${T.accent}▶${C.reset} ${T.secondary}${sender}${C.reset}: ${T.primary}${text}${C.reset}`);
    } else {
        // Ограничиваем длину сообщения для телефона
        const shortText = text.length > 50 ? text.slice(0, 47) + '...' : text;
        console.log(`${C.dim}${time}${C.reset} ${T.primary}◀${C.reset} ${T.primary}${sender}${C.reset}: ${T.secondary}${shortText}${C.reset}`);
    }
}

// --- СЕТЬ ---
const client = mqtt.connect('mqtt://broker.hivemq.com', {
    keepalive: 60,
    reconnectPeriod: 1000
});

client.on('connect', () => {
    drawCompactHeader();
    joinRoom('global');
    console.log(`${T.success}✓ Connected to network${C.reset}`);
    setTimeout(() => drawCompactHeader(), 1000);
});

client.on('reconnect', () => {
    console.log(`\n${T.info}⟳ Reconnecting...${C.reset}`);
});

client.on('error', (err) => {
    console.log(`\n${T.error}✗ Connection error${C.reset}`);
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        if (data.type === 'sys') {
            if (data.act === 'kick' && data.tgt === user) {
                console.log(`\n${T.error}⚠️  KICKED FROM ROOM ⚠️${C.reset}`);
                setTimeout(() => joinRoom('global'), 1500);
                return;
            }
            if (data.act === 'clr') { 
                drawCompactHeader();
                console.log(`${T.success}✨ Screen cleared${C.reset}`);
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
    drawCompactHeader();
    
    const roleText = admin ? `${T.accent}admin${C.reset}` : `${T.secondary}user${C.reset}`;
    console.log(`${T.success}✓ Joined "${T.primary}${room}${C.reset}" as ${roleText}${C.reset}`);
    setPrompt();
    rl.prompt();
}

// --- ИНТЕРФЕЙС ВВОДА ---
const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout,
    terminal: true,
    prompt: ''
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
                drawMiniHelp();
                break;
                
            case '/croom':
                if (!args[0]) {
                    console.log(`${T.error}✗ Room name required${C.reset}`);
                } else {
                    joinRoom(args[0], true);
                }
                break;
                
            case '/room':
                joinRoom(args[0] || 'global', false);
                break;
                
            case '/nick':
                if (!args[0]) {
                    console.log(`${T.error}✗ Nickname required${C.reset}`);
                } else {
                    user = args[0];
                    drawCompactHeader();
                    console.log(`${T.success}✓ Nickname changed to "${user}"${C.reset}`);
                }
                break;
                
            case '/theme':
                if (!args[0]) {
                    console.log(`${T.secondary}Themes: matrix, robot, ghost, sunset${C.reset}`);
                } else if (Themes[args[0]]) {
                    T = Themes[args[0]];
                    drawCompactHeader();
                    console.log(`${T.success}✓ Theme: ${T.name}${C.reset}`);
                } else {
                    console.log(`${T.error}✗ Theme "${args[0]}" not found${C.reset}`);
                }
                break;
                
            case '/clear':
                if (isAdmin) {
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'clr'}));
                    console.log(`${T.success}✓ Screen cleared for all${C.reset}`);
                } else {
                    drawCompactHeader();
                    console.log(`${T.success}✓ Screen cleared${C.reset}`);
                }
                break;
                
            case '/kick':
                if (!args[0]) {
                    console.log(`${T.error}✗ Username required${C.reset}`);
                } else if (isAdmin) {
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'kick', tgt: args[0]}));
                    console.log(`${T.success}✓ Kicked: ${args[0]}${C.reset}`);
                } else {
                    console.log(`${T.error}✗ Admin only${C.reset}`);
                }
                break;
                
            default:
                console.log(`${T.error}✗ Unknown command. Use /help${C.reset}`);
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
    console.log(`\n${T.secondary}👋 Goodbye!${C.reset}`);
    client.end();
    rl.close();
    process.exit(0);
});

// --- СТАРТ ---
setTimeout(() => {
    console.log(`${T.info}💡 Type /help for commands${C.reset}`);
    setPrompt();
    rl.prompt();
}, 1500);
