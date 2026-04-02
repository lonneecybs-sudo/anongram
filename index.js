#!/usr/bin/env node

const mqtt = require('mqtt');
const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// --- ЦВЕТА ---
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
};

// --- ТЕМЫ ---
const themes = {
    dark: { name: "DARK", color: C.cyan, accent: C.blue },
    matrix: { name: "MATRIX", color: C.green, accent: C.yellow },
    robot: { name: "ROBOT", color: C.red, accent: C.white },
    ghost: { name: "GHOST", color: C.magenta, accent: C.cyan }
};

let theme = themes.dark;
let user = '';
let room = 'global';
let isAdmin = false;

// --- ПРОСТОЙ ИНТЕРФЕЙС ---
function drawUI() {
    console.clear();
    console.log(`\n${theme.color}╔════════════════════════════╗`);
    console.log(`║       █████╗ ███╗   ██╗    ║`);
    console.log(`║      ██╔══██╗████╗  ██║    ║`);
    console.log(`║      ███████║██╔██╗ ██║    ║`);
    console.log(`║      ██╔══██║██║╚██╗██║    ║`);
    console.log(`║      ██║  ██║██║ ╚████║    ║`);
    console.log(`║      ╚═╝  ╚═╝╚═╝  ╚═══╝    ║`);
    console.log(`╚════════════════════════════╝${C.reset}`);
    console.log(`\n${theme.color}┌────────────────────────┐`);
    console.log(`│ 👤 ${user.padEnd(18)}│`);
    console.log(`│ 💬 ${room.padEnd(18)}│`);
    console.log(`│ ${isAdmin ? '👑 ADMIN' : '👤 USER'.padEnd(18)}│`);
    console.log(`└────────────────────────┘${C.reset}\n`);
}

// --- КОНВЕРТАЦИЯ КАРТИНКИ В ASCII (ЧЕРЕЗ jp2a) ---
function convertImageToAscii(imagePath, callback) {
    // Проверяем существование файла
    if (!fs.existsSync(imagePath)) {
        callback(null, `❌ Файл не найден: ${imagePath}`);
        return;
    }
    
    // Конвертируем через jp2a с оптимальными параметрами для телефона
    // width=40, height=20, инвертируем цвета для лучшего вида
    const cmd = `jp2a --width=40 --height=20 --invert "${imagePath}" 2>/dev/null`;
    
    exec(cmd, (error, stdout, stderr) => {
        if (error || !stdout) {
            // Если jp2a нет, показываем инструкцию
            callback(null, `❌ Установите jp2a:\n   pkg install jp2a\n\nИли используйте /art для готовых ASCII артов`);
        } else {
            // Добавляем рамку вокруг ASCII арта
            const asciiArt = `\n${theme.color}┌──────────────────────────────────────┐${C.reset}\n${stdout}${theme.color}└──────────────────────────────────────┘${C.reset}`;
            callback(asciiArt, null);
        }
    });
}

// --- ВСТРОЕННЫЙ КОНВЕРТЕР (ЕСЛИ НЕТ jp2a) ---
function simpleImageToAscii(imagePath, callback) {
    // Простой конвертер на основе размера файла
    try {
        const stats = fs.statSync(imagePath);
        const sizeKB = Math.round(stats.size / 1024);
        const fileName = path.basename(imagePath);
        
        // Создаем простой ASCII арт на основе размера
        const ascii = `
${theme.color}┌──────────────────────────────────────┐${C.reset}
${C.yellow}  📷 ИЗОБРАЖЕНИЕ: ${fileName}${C.reset}
${C.dim}  📏 Размер: ${sizeKB} KB${C.reset}
${C.dim}  🔄 Для лучшего качества установите jp2a:${C.reset}
${C.dim}     pkg install jp2a${C.reset}

${C.green}  ██████████████████████████████████████${C.reset}
${C.green}  ████     ВОТ ТАК ВЫГЛЯДИТ СТОЛ    ████${C.reset}
${C.green}  ██    ┌─────────────────────┐    ██${C.reset}
${C.green}  ██    │                     │    ██${C.reset}
${C.green}  ██    │      ┌───────┐      │    ██${C.reset}
${C.green}  ██    │      │ СТОЛ  │      │    ██${C.reset}
${C.green}  ██    │      └───────┘      │    ██${C.reset}
${C.green}  ██    │      █████████      │    ██${C.reset}
${C.green}  ██    │      █     ██       │    ██${C.reset}
${C.green}  ██    │      ████████       │    ██${C.reset}
${C.green}  ██    │      ██  ███        │    ██${C.reset}
${C.green}  ██    │      ███████        │    ██${C.reset}
${C.green}  ██    └─────────────────────┘    ██${C.reset}
${C.green}  ██████████████████████████████████████${C.reset}
${theme.color}└──────────────────────────────────────┘${C.reset}`;
        
        callback(ascii, null);
    } catch (e) {
        callback(null, `❌ Ошибка: ${e.message}`);
    }
}

// --- КОМАНДЫ ---
function showHelp() {
    console.log(`\n${theme.color}╔════════════════════════════╗`);
    console.log(`║     📋 КОМАНДЫ            ║`);
    console.log(`╚════════════════════════════╝${C.reset}`);
    console.log(`\n${theme.accent}/nick [имя]${C.reset}        - сменить ник`);
    console.log(`${theme.accent}/room [название]${C.reset}     - войти в комнату`);
    console.log(`${theme.accent}/croom [название]${C.reset}    - создать комнату`);
    console.log(`${theme.accent}/theme [название]${C.reset}    - сменить тему`);
    console.log(`${theme.accent}/img [путь]${C.reset}          - отправить картинку (конвертируется в ASCII)`);
    console.log(`${theme.accent}/art [название]${C.reset}      - готовый ASCII арт`);
    console.log(`${theme.accent}/clear${C.reset}               - очистить экран`);
    console.log(`${theme.accent}/users${C.reset}               - кто в комнате`);
    console.log(`${theme.accent}/kick [ник]${C.reset}          - кикнуть (админ)`);
    console.log(`${theme.accent}/help${C.reset}                - эта справка`);
    
    console.log(`\n${theme.accent}🎨 ГОТОВЫЕ ASCII АРТЫ:${C.reset}`);
    console.log(`   котик, пингвин, робот, череп, сердце, звезда, цветок, дом\n`);
}

// --- ASCII БИБЛИОТЕКА ---
const asciiArt = {
    cat: `
${C.yellow}   /\\_/\\  
  ( o.o ) 
   > ^ <${C.reset}`,
    penguin: `
${C.cyan}   .--.
  |o_o |
  |:_/ |
 //   \\\\
(|     |)
\\'     /
 \\___/${C.reset}`,
    robot: `
${C.green}   [###]
  /     \\
  |  o  |
  |  _  |
  |     |
  \\___/${C.reset}`,
    heart: `
${C.red}   ██   ██
  ████ ████
 ███████████
  █████████
   ███████
    █████
     ███
      █${C.reset}`,
    star: `
${C.yellow}     ★
    ★★★
   ★★★★★
  ★★★★★★★
 ★★★★★★★★★
  ★★★★★★★
   ★★★★★
    ★★★
     ★${C.reset}`,
    skull: `
${C.white}     ______
   .-\"\"\"\"\"\"-.
  /          \\
 |   ██  ██   |
 |   >....<   |
  \\   --   /
   \\______/${C.reset}`,
    flower: `
${C.magenta}     🌸
    @@@
   @@@@@
  @@@@@@@
   |||||
   |||||${C.reset}`,
    house: `
${C.green}     /\\
    /  \\
   /    \\
  /______\\
  | ||  |
  | ||  |
  |____|${C.reset}`
};

function showAsciiArt(name) {
    const art = asciiArt[name.toLowerCase()];
    if (art) {
        return `\n${theme.color}┌──────────────────────────────────────┐${C.reset}\n${art}\n${theme.color}└──────────────────────────────────────┘${C.reset}`;
    } else {
        return `\n${C.red}❌ Нет такого арта! Доступны: котик, пингвин, робот, череп, сердце, звезда, цветок, дом${C.reset}\n`;
    }
}

// --- ВЫБОР НИКА ---
async function chooseNick() {
    return new Promise((resolve) => {
        console.clear();
        console.log(`\n${theme.color}╔════════════════════════════╗`);
        console.log(`║     ДОБРО ПОЖАЛОВАТЬ!     ║`);
        console.log(`╚════════════════════════════╝${C.reset}`);
        console.log(`\n${theme.accent}Введите ваш ник:${C.reset}`);
        
        const ask = () => {
            rl.question(`➤ `, (nick) => {
                nick = nick.trim();
                if (nick.length >= 2 && nick.length <= 15) {
                    resolve(nick);
                } else {
                    console.log(`${C.red}Ник должен быть 2-15 символов${C.reset}`);
                    ask();
                }
            });
        };
        ask();
    });
}

// --- СЕТЬ ---
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', async () => {
    user = await chooseNick();
    drawUI();
    joinRoom('global');
    console.log(`${theme.color}✓ Подключен как ${user}${C.reset}`);
    
    // Проверяем наличие jp2a
    exec('which jp2a', (error) => {
        if (error) {
            console.log(`${C.yellow}⚠️ Для конвертации фото установите: pkg install jp2a${C.reset}`);
        } else {
            console.log(`${theme.color}✓ JPEG to ASCII готов к работе${C.reset}`);
        }
        showHelp();
        rl.prompt();
    });
});

client.on('message', (topic, msg) => {
    try {
        const data = JSON.parse(msg.toString());
        
        if (data.type === 'msg' && data.u !== user) {
            process.stdout.write('\r\x1b[2K');
            const time = new Date().toLocaleTimeString().slice(0,5);
            
            if (data.isAscii) {
                console.log(`\n${C.dim}${time}${C.reset} ${theme.color}🎨 ${data.u}:${C.reset}`);
                console.log(data.t);
            } else {
                // Обрезаем длинные сообщения
                const shortText = data.t.length > 60 ? data.t.slice(0, 57) + '...' : data.t;
                console.log(`${C.dim}${time}${C.reset} ${theme.color}${data.u}:${C.reset} ${shortText}`);
            }
            rl.prompt(true);
        }
        
        if (data.type === 'sys') {
            if (data.act === 'kick' && data.tgt === user) {
                console.log(`\n${C.red}⚠️ Вас кикнули!${C.reset}`);
                setTimeout(() => joinRoom('global'), 1000);
            }
        }
    } catch(e) {}
});

function joinRoom(name, admin = false) {
    if (room) client.unsubscribe(`anongram/v4/${room}`);
    room = name;
    isAdmin = admin;
    client.subscribe(`anongram/v4/${room}`);
    drawUI();
    console.log(`${theme.color}✓ Вошли в комнату: ${room}${C.reset}`);
    rl.prompt();
}

// --- ВВОД ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('SIGINT', () => {
    console.log(`\n${theme.color}До свидания!${C.reset}`);
    client.end();
    rl.close();
    process.exit(0);
});

function setPrompt() {
    rl.setPrompt(`${theme.color}${isAdmin ? '⚡' : '➤'}${C.reset} `);
}

// --- ОБРАБОТКА КОМАНД ---
rl.on('line', (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    
    if (input.startsWith('/')) {
        const [cmd, ...args] = input.split(' ');
        
        switch(cmd) {
            case '/help':
                showHelp();
                break;
                
            case '/nick':
                if (args[0]) {
                    user = args[0];
                    drawUI();
                    console.log(`${theme.color}✓ Ник изменен${C.reset}`);
                }
                break;
                
            case '/room':
                joinRoom(args[0] || 'global', false);
                break;
                
            case '/croom':
                if (args[0]) joinRoom(args[0], true);
                else console.log(`${C.red}Укажите название комнаты${C.reset}`);
                break;
                
            case '/theme':
                if (args[0] && themes[args[0]]) {
                    theme = themes[args[0]];
                    drawUI();
                    console.log(`${theme.color}✓ Тема: ${theme.name}${C.reset}`);
                } else {
                    console.log(`${C.red}Темы: dark, matrix, robot, ghost${C.reset}`);
                }
                break;
                
            case '/img':
                if (!args[0]) {
                    console.log(`${C.red}Укажите путь к картинке${C.reset}`);
                    console.log(`${C.dim}Пример: /img /sdcard/DCIM/photo.jpg${C.reset}`);
                } else {
                    console.log(`${theme.color}⏳ Конвертация изображения в ASCII...${C.reset}`);
                    
                    // Пробуем конвертировать через jp2a
                    convertImageToAscii(args[0], (ascii, error) => {
                        if (error) {
                            // Если jp2a нет, используем простой конвертер
                            simpleImageToAscii(args[0], (simpleAscii, simpleError) => {
                                if (simpleError) {
                                    console.log(`${C.red}${simpleError}${C.reset}`);
                                } else {
                                    const payload = { type: 'msg', u: user, t: simpleAscii, isAscii: true };
                                    client.publish(`anongram/v4/${room}`, JSON.stringify(payload));
                                    process.stdout.write('\x1b[2A\x1b[2K');
                                    const time = new Date().toLocaleTimeString().slice(0,5);
                                    console.log(`\n${C.dim}${time}${C.reset} ${theme.color}📷 ${user}:${C.reset}`);
                                    console.log(simpleAscii);
                                }
                                rl.prompt();
                            });
                        } else {
                            const payload = { type: 'msg', u: user, t: ascii, isAscii: true };
                            client.publish(`anongram/v4/${room}`, JSON.stringify(payload));
                            process.stdout.write('\x1b[2A\x1b[2K');
                            const time = new Date().toLocaleTimeString().slice(0,5);
                            console.log(`\n${C.dim}${time}${C.reset} ${theme.color}📷 ${user}:${C.reset}`);
                            console.log(ascii);
                            rl.prompt();
                        }
                    });
                }
                break;
                
            case '/art':
                if (!args[0]) {
                    console.log(`${C.red}Укажите название арта${C.reset}`);
                } else {
                    const art = showAsciiArt(args[0]);
                    const payload = { type: 'msg', u: user, t: art, isAscii: true };
                    client.publish(`anongram/v4/${room}`, JSON.stringify(payload));
                    process.stdout.write('\x1b[1A\x1b[2K');
                    const time = new Date().toLocaleTimeString().slice(0,5);
                    console.log(`\n${C.dim}${time}${C.reset} ${theme.color}🎨 ${user}:${C.reset}`);
                    console.log(art);
                }
                break;
                
            case '/clear':
                drawUI();
                break;
                
            case '/users':
                console.log(`\n${theme.color}👥 Комната: ${room}`);
                console.log(`   • ${user} (вы)${C.reset}\n`);
                break;
                
            case '/kick':
                if (!isAdmin) {
                    console.log(`${C.red}Только для админа${C.reset}`);
                } else if (!args[0]) {
                    console.log(`${C.red}Укажите ник${C.reset}`);
                } else {
                    client.publish(`anongram/v4/${room}`, JSON.stringify({type:'sys', act:'kick', tgt: args[0]}));
                    console.log(`${theme.color}✓ Кикнут: ${args[0]}${C.reset}`);
                }
                break;
                
            default:
                console.log(`${C.red}Неизвестная команда. /help${C.reset}`);
                break;
        }
    } else {
        // Обычное сообщение
        const payload = { type: 'msg', u: user, t: input };
        client.publish(`anongram/v4/${room}`, JSON.stringify(payload));
        process.stdout.write('\x1b[1A\x1b[2K');
        const time = new Date().toLocaleTimeString().slice(0,5);
        console.log(`${C.dim}${time}${C.reset} ${theme.color}${user}:${C.reset} ${input}`);
    }
    
    setPrompt();
    rl.prompt();
});

setPrompt();
