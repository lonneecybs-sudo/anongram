#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- РАСШИРЕННАЯ ПАЛИТРА ---
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    
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
        name: "🤖 ROBOT",
        primary: C.red,
        secondary: C.brightRed,
        accent: C.brightYellow,
        border: C.red,
        error: C.brightRed,
        success: C.green,
        info: C.blue,
        logo: `
${C.red}╔════════════════════╗
║  ██████╗  ██████╗  ║
║  ██╔══██╗██╔══██╗ ║
║  ██████╔╝██████╔╝ ║
║  ██╔══██╗██╔══██╗ ║
║  ██║  ██║██║  ██║ ║
║  ╚═╝  ╚═╝╚═╝  ╚═╝ ║
╚════════════════════╝
${C.dim}└── ROBOT MODE ────┘${C.reset}`
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
let mutedUsers = new Set();
let bannedUsers = new Set();
let messageHistory = [];
let compactMode = false;
let startTime = Date.now();

// --- ФУНКЦИИ ИНТЕРФЕЙСА ---
function drawHeader() {
    console.clear();
    if (!compactMode) console.log(T.logo);
    
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
    console.log(`${T.secondary}│ ${T.accent}/compact${' '.repeat(5)}${C.reset}• Toggle compact mode     ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/whoami${' '.repeat(6)}${C.reset}• Show my info            ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/uptime${' '.repeat(6)}${C.reset}• Session uptime          ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ 🏠 ROOM COMMANDS                │${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/room [name]${' '.repeat(4)}${C.reset}• Join room               ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/croom [name]${' '.repeat(3)}${C.reset}• Create room (admin)     ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/users${' '.repeat(7)}${C.reset}• Show users in room      ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ 💌 MESSAGING                    │${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/dm [user] [msg]${' '.repeat(2)}${C.reset}• Direct message          ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/me [action]${' '.repeat(4)}${C.reset}• Action in 3rd person    ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/img [url/path]${' '.repeat(3)}${C.reset}• Send image              ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/history [n]${' '.repeat(4)}${C.reset}• Show last N messages    ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ 🎮 FUN COMMANDS                 │${C.reset}`);
    console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/roll${' '.repeat(8)}${C.reset}• Roll a dice (1-6)       ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/coin${' '.repeat(8)}${C.reset}• Flip a coin             ${T.secondary}│${C.reset}`);
    console.log(`${T.secondary}│ ${T.accent}/8ball [q]${' '.repeat(6)}${C.reset}• Magic 8-ball            ${T.secondary}│${C.reset}`);
    
    if (isAdmin) {
        console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
        console.log(`${T.secondary}│ 👑 ADMIN COMMANDS               │${C.reset}`);
        console.log(`${T.secondary}├────────────────────────────────┤${C.reset}`);
        console.log(`${T.secondary}│ ${T.accent}/kick [user]${' '.repeat(4)}${C.reset}• Kick user               ${T.secondary}│${C.reset}`);
        console.log(`${T.secondary}│ ${T.accent}/mute [user]${' '.repeat(4)}${C.reset}• Mute user              ${T.secondary}│${C.reset}`);
        console.log(`${T.secondary}│ ${T.accent}/unmute [user]${' '.repeat(2)}${C.reset}• Unmute user            ${T.secondary}│${C.reset}`);
        console.log(`${T.secondary}│ ${T.accent}/ban [user]${' '.repeat(5)}${C.reset}• Ban user               ${T.secondary}│${C.reset}`);
        console.log(`${T.secondary}│ ${T.accent}/announce [msg]${' '.repeat(2)}${C.reset}• Make announcement      ${T.secondary}│${C.reset}`);
    }
    
    console.log(`${T.secondary}└────────────────────────────────┘${C.reset}\n`);
    console.log(`${T.info}💡 Available themes: ${T.accent}matrix${C.reset}, ${T.accent}robot${C.reset}, ${T.accent}ghost${C.reset}`);
    console.log(`${T.info}📸 Send image: ${T.accent}/img https://example.com/image.jpg${C.reset} or ${T.accent}/img ~/photo.png${C.reset}`);
    console.log(`${T.info}💬 Just type your message to chat\n${C.reset}`);
}

function displayMessage(sender, text, isOwn = false, isAction = false, isImage = false) {
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    if (isAction) {
        console.log(`${C.dim}${time}${C.reset} ${T.accent}*${C.reset} ${T.secondary}${sender}${C.reset} ${T.italic}${text}${C.reset}`);
    } else if (isImage) {
        console.log(`${C.dim}${time}${C.reset} ${T.accent}🖼️${C.reset} ${T.primary}${sender}${C.reset}: ${T.brightCyan}[IMAGE]${C.reset} ${T.dim}${text}${C.reset}`);
    } else {
        const shortText = text.length > 55 ? text.slice(0, 52) + '...' : text;
        if (isOwn) {
            console.log(`${C.dim}${time}${C.reset} ${T.accent}▶${C.reset} ${T.secondary}${sender}${C.reset}: ${T.primary}${shortText}${C.reset}`);
        } else {
            console.log(`${C.dim}${time}${C.reset} ${T.primary}◀${C.reset} ${T.primary}${sender}${C.reset}: ${T.secondary}${shortText}${C.reset}`);
        }
    }
    
    // Сохраняем в историю
    messageHistory.push({ time, sender, text, isOwn, isAction, isImage });
    if (messageHistory.length > 100) messageHistory.shift();
}

// --- ФУНКЦИИ ДЛЯ КАРТИНОК ---
function encodeImageToBase64(filePath) {
    try {
        const imageBuffer = fs.readFileSync(filePath);
        const base64 = imageBuffer.toString('base64');
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        if (ext === '.gif') mimeType = 'image/gif';
        if (ext === '.webp') mimeType = 'image/webp';
        return `data:${mimeType};base64,${base64.slice(0, 500)}... [${Math.round(base64.length * 0.75 / 1024)}KB]`;
    } catch (e) {
        return null;
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// --- ИГРОВЫЕ ФУНКЦИИ ---
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function flipCoin() {
    return Math.random() < 0.5 ? 'ОРЕЛ' : 'РЕШКА';
}

function magic8Ball(question) {
    const answers = [
        "✅ Определенно да", "❌ Определенно нет", "🤔 Спроси позже", 
        "🎯 Да", "💀 Нет", "⭐ Вероятно", "🌈 Возможно", 
        "🔮 Знаки говорят - да", "⚡ Лучше не сейчас", "💫 Без сомнения"
    ];
    return answers[Math.floor(Math.random() * answers.length)];
}

// --- ВЫБОР НИКА ---
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

// --- СЕТЬ ---
const client = mqtt.connect('mqtt://broker.hivemq.com', {
    keepalive: 60,
    reconnectPeriod: 1000
});

client.on('connect', async () => {
    user = await chooseNickname();
    drawHeader();
    joinRoom('global');
    console.log(`${T.success}✓ Connected as ${T.accent}${user}${C.reset}`);
    drawFullHelp();
    setPrompt();
    rl.prompt();
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'sys') {
            if (data.act === 'kick' && data.tgt === user) {
                console.log(`\n${T.error}⚠️  YOU WERE KICKED FROM ${room} ⚠️${C.reset}`);
                setTimeout(() => joinRoom('global'), 1500);
                return;
            }
            if (data.act === 'mute' && data.tgt === user) {
                console.log(`\n${T.error}🔇 YOU WERE MUTED IN ${room}${C.reset}`);
                return;
            }
            if (data.act === 'unmute' && data.tgt === user) {
                console.log(`\n${T.success}🔊 YOU WERE UNMUTED IN ${room}${C.reset}`);
                return;
            }
            if (data.act === 'clr') { 
                drawHeader();
                console.log(`${T.success}✨ Screen cleared by admin${C.reset}`);
            }
            if (data.act === 'announce') {
                console.log(`\n${T.accent}📢 ANNOUNCEMENT: ${data.msg}${C.reset}`);
            }
            return;
        }
        
        // Проверка на мут
        if (mutedUsers.has(data.u) && data.u !== user) return;
        
        if (data.type === 'msg' && data.u !== user) {
            process.stdout.write('\r\x1b[2K');
            if (data.isAction) {
                displayMessage(data.u, data.t, false, true);
            } else if (data.isImage) {
                displayMessage(data.u, data.t, false, false, true);
            } else {
                displayMessage(data.u, data.t);
            }
            rl.prompt(true);
        }
        
        if (data.type === 'dm' && data.to === user) {
            console.log(`\n${T.accent}🔒 DM from ${data.from}: ${data.msg}${C.reset}`);
            rl.prompt(true);
        }
    } catch (e) {}
});

function joinRoom(name, admin = false) {
    if (room) client.unsubscribe(`anongram/v4/${room}`);
    room = name;
    isAdmin = admin;
    mutedUsers.clear();
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
    
    // Проверка на мут для обычных сообщений
    if (mutedUsers.has(user) && !input.startsWith('/')) {
        console.log(`${T.error}🔇 You are muted in this room${C.reset}`);
        rl.prompt();
        return;
    }

    if (input.startsWith('/')) {
        const [cmd, ...args] = input.split(' ');
        
        switch(cmd) {
            case '/help':
                drawFullHelp();
                break;
                
            case '/compact':
                compactMode = !compactMode;
                drawHeader();
                console.log(`${T.success}✓ Compact mode: ${compactMode ? 'ON' : 'OFF'}${C.reset}`);
                break;
                
            case '/whoami':
                console.log(`\n${T.info}📝 Nick: ${T.accent}${user}${C.reset}`);
                console.log(`${T.info}👑 Role: ${isAdmin ? 'ADMIN' : 'USER'}${C.reset}`);
                console.log(`${T.info}💬 Room: ${T.primary}${room}${C.reset}`);
                console.log(`${T.info}🎨 Theme: ${T.name}${C.reset}`);
                console.log(`${T.info}⏱️  Uptime: ${Math.floor((Date.now() - startTime) / 60000)} min${C.reset}\n`);
                break;
                
            case '/uptime':
                const minutes = Math.floor((Date.now() - startTime) / 60000);
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                console.log(`\n${T.info}⏱️  Session uptime: ${hours}h ${mins}min${C.reset}\n`);
                break;
                
            case '/users':
                console.log(`\n${T.info}👥 Users in ${T.primary}${room}${C.reset}:${C.reset}`);
                console.log(`${T.secondary}  • ${user} (you)${C.reset}`);
                console.log(`${T.dim}  (Use /dm to message users)${C.reset}\n`);
                break;
                
            case '/history':
                let count = parseInt(args[0]) || 10;
                count = Math.min(count, 50);
                console.log(`\n${T.info}📜 Last ${count} messages:${C.reset}\n`);
                const recent = messageHistory.slice(-count);
                recent.forEach(msg => {
                    const prefix = msg.isOwn ? '▶' : '◀';
                    console.log(`${C.dim}${msg.time}${C.reset} ${prefix} ${msg.sender}: ${msg.text}`);
                });
                console.log('');
                break;
                
            case '/dm':
                if (args.length < 2) {
                    console.log(`${T.error}✗ Usage: /dm [user] [message]${C.reset}`);
                } else {
                    const target = args[0];
                    const dmMsg = args.slice(1).join(' ');
                    client.publish(`anongram/v4/${room}`, JSON.stringify({
                        type: 'dm', from: user, to: target, msg: dmMsg
                    }));
                    console.log(`${T.success}✓ DM sent to ${target}${C.reset}`);
                }
                break;
                
            case '/me':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /me [action]${C.reset}`);
                } else {
                    const action = args.join(' ');
                    const payload = { type: 'msg', u: user, t: action, isAction: true };
                    client.publish(`anongram/v4/${room}`, JSON.stringify(payload));
                    process.stdout.write('\x1b[1A\x1b[2K');
                    displayMessage(user, action, true, true);
                }
                break;
                
            case '/img':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /img [image_url] or /img [file_path]${C.reset}`);
                    console.log(`${T.info}📸 Examples: /img https://example.com/photo.jpg${C.reset}`);
                    console.log(`${T.info}📸 Or: /img ~/Pictures/meme.png${C.reset}`);
                } else {
                    let imageData = args[0];
                    let isFile = false;
                    
                    // Проверяем, это файл или URL
                    if (!isValidUrl(imageData)) {
                        // Пробуем как локальный файл
                        const expandedPath = imageData.replace(/^~/, process.env.HOME);
                        const base64 = encodeImageToBase64(expandedPath);
                        if (base64) {
                            imageData = base64;
                            isFile = true;
                        } else {
                            console.log(`${T.error}✗ Cannot read image file${C.reset}`);
                            rl.prompt();
                            return;
                        }
                    }
                    
                    const payload = { type: 'msg', u: user, t: imageData, isImage: true };
                    client.publish(`anongram/v4/${room}`, JSON.stringify(payload));
                    process.stdout.write('\x1b[1A\x1b[2K');
                    const displayText = isFile ? `📸 Image sent` : `🖼️ Image: ${imageData.slice(0, 50)}...`;
                    displayMessage(user, displayText, true, false, true);
                }
                break;
                
            case '/roll':
                const result = rollDice();
                const actionText = `бросает кубик и выпадает ${result}`;
                const rollPayload = { type: 'msg', u: user, t: actionText, isAction: true };
                client.publish(`anongram/v4/${room}`, JSON.stringify(rollPayload));
                process.stdout.write('\x1b[1A\x1b[2K');
                displayMessage(user, actionText, true, true);
                break;
                
            case '/coin':
                const coinResult = flipCoin();
                const coinText = `подбрасывает монетку — выпадает ${coinResult}`;
                const coinPayload = { type: 'msg', u: user, t: coinText, isAction: true };
                client.publish(`anongram/v4/${room}`, JSON.stringify(coinPayload));
                process.stdout.write('\x1b[1A\x1b[2K');
                displayMessage(user, coinText, true, true);
                break;
                
            case '/8ball':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /8ball [question]${C.reset}`);
                } else {
                    const question = args.join(' ');
                    const answer = magic8Ball(question);
                    const ballText = `спрашивает: "${question}" → 🎱 ${answer}`;
                    const ballPayload = { type: 'msg', u: user, t: ballText, isAction: true };
                    client.publish(`anongram/v4/${room}`, JSON.stringify(ballPayload));
                    process.stdout.write('\x1b[1A\x1b[2K');
                    displayMessage(user, ballText, true, true);
                }
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
                
            case '/mute':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /mute [username]${C.reset}`);
                } else if (isAdmin) {
                    mutedUsers.add(args[0]);
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'mute', tgt: args[0]}));
                    console.log(`${T.success}🔇 Muted: ${args[0]}${C.reset}`);
                } else {
                    console.log(`${T.error}✗ Admin only command${C.reset}`);
                }
                break;
                
            case '/unmute':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /unmute [username]${C.reset}`);
                } else if (isAdmin) {
                    mutedUsers.delete(args[0]);
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'unmute', tgt: args[0]}));
                    console.log(`${T.success}🔊 Unmuted: ${args[0]}${C.reset}`);
                } else {
                    console.log(`${T.error}✗ Admin only command${C.reset}`);
                }
                break;
                
            case '/ban':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /ban [username]${C.reset}`);
                } else if (isAdmin) {
                    bannedUsers.add(args[0]);
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'kick', tgt: args[0]}));
                    console.log(`${T.success}🔨 Banned: ${args[0]}${C.reset}`);
                } else {
                    console.log(`${T.error}✗ Admin only command${C.reset}`);
                }
                break;
                
            case '/announce':
                if (!args[0]) {
                    console.log(`${T.error}✗ Usage: /announce [message]${C.reset}`);
                } else if (isAdmin) {
                    const announcement = args.join(' ');
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'announce', msg: announcement}));
                    console.log(`${T.success}📢 Announcement sent${C.reset}`);
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

setTimeout(() => {
    setPrompt();
    rl.prompt();
}, 1500);
