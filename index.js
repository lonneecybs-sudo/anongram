#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');

// --- ЦВЕТОВАЯ ПАЛИТРА ---
const C = {
    res: "\x1b[0m",
    b: "\x1b[1m",
    d: "\x1b[2m",
    // Темы
    matrix: { m: "\x1b[32m", s: "\x1b[36m", t: "MATRIX" },
    robot:  { m: "\x1b[31m", s: "\x1b[37m", t: "FSOCIETY" },
    ghost:  { m: "\x1b[35m", s: "\x1b[34m", t: "GHOST" }
};

let T = C.matrix;
let room = 'global';
let user = 'an' + crypto.randomBytes(1).toString('hex');
let isAdmin = false;

// --- МИНИ-ЛОГО (3 строки, влезет в любой телефон) ---
const LOGO = (theme) => `
${theme.m}■ ${theme.s}ANONGRAM ${theme.m}v4 ${theme.s}[MOBILE]${C.res}
${theme.m}└───────────────────────${C.res}`;

function drawUI() {
    console.clear();
    console.log(LOGO(T));
    const role = isAdmin ? "ROOT" : "USER";
    // Компактная статус-строка
    console.log(`${C.d}ID:${C.res}${T.m}${user}${C.res} | ${C.d}RM:${C.res}${T.s}${room}${C.res} | ${C.d}${role}${C.res}`);
    console.log(`${T.m}───────────────────────${C.res}`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function setPrompt() {
    const sym = isAdmin ? "#" : ">";
    rl.setPrompt(`${T.m}${sym}${C.res} `);
}

// --- СЕТЬ ---
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
    drawUI();
    joinRoom('global');
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        if (data.type === 'sys') {
            if (data.act === 'kick' && data.tgt === user) {
                console.log(`\n${C.b}${T.m}[!] KICKED BY ADMIN${C.res}`);
                return joinRoom('global');
            }
            if (data.act === 'clr') { drawUI(); console.log(`${T.m}[!] Buffer cleared${C.res}`); }
            return;
        }

        if (data.type === 'msg' && data.u !== user) {
            process.stdout.write('\r\x1b[K'); // Очистка строки ввода
            const time = new Date().toLocaleTimeString().slice(0, 5);
            console.log(`${C.d}${time}${C.res} ${T.m}${data.u}${C.res}: ${data.t}`);
            rl.prompt(true);
        }
    } catch (e) {}
});

function joinRoom(name, admin = false) {
    if (room) client.unsubscribe(`anongram/v4/${room}`);
    room = name;
    isAdmin = admin;
    client.subscribe(`anongram/v4/${room}`);
    drawUI();
    setPrompt();
    rl.prompt();
}

// --- КОМАНДЫ ---
rl.on('line', (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    if (input.startsWith('/')) {
        const [cmd, ...args] = input.split(' ');
        switch(cmd) {
            case '/help':
                console.log(`\n${C.b}COMMANDS:${C.res}\n/croom [n] - Create(Admin)\n/room [n]  - Join\n/nick [n]  - Nickname\n/theme [matrix/robot/ghost]\n/kick [u]  - Admin only\n/clear     - Reset screen\n`);
                break;
            case '/croom': joinRoom(args[0] || 'private', true); break;
            case '/room': joinRoom(args[0] || 'global', false); break;
            case '/nick': user = args[0] || user; drawUI(); break;
            case '/theme': if (C[args[0]]) { T = C[args[0]]; drawUI(); } break;
            case '/clear': 
                if (isAdmin) client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'clr'}));
                else drawUI(); 
                break;
            case '/kick':
                if (isAdmin) client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'kick', tgt: args[0]}));
                break;
        }
    } else {
        const payload = { type: 'msg', u: user, t: input };
        client.publish(`anongram/v4/${room}`, payload.type ? JSON.stringify(payload) : "");
        
        // Удаляем то, что ввел пользователь, и выводим красиво
        process.stdout.write('\x1b[1A\x1b[2K'); 
        const time = new Date().toLocaleTimeString().slice(0, 5);
        console.log(`${C.d}${time}${C.res} ${C.b}YOU${C.res}: ${input}`);
    }
    setPrompt();
    rl.prompt();
});
