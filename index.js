const hyperswarm = require('hyperswarm');
const crypto = require('crypto');
const readline = require('readline');
const b4a = require('b4a');

const swarm = hyperswarm();
let nickname = 'nonsport';
let currentRoom = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>> '
});

// Шифрование (простой XOR на основе хеша комнаты)
function crypt(data, key) {
    const res = b4a.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        res[i] = data[i] ^ key[i % key.length];
    }
    return res;
}

console.clear();
console.log('╔══════════════════════════════════════╗');
console.log('║       ANONGRAM P2P TERMINAL          ║');
console.log('╚══════════════════════════════════════╝');

rl.question('[?] Введите название комнаты: ', (roomName) => {
    currentRoom = crypto.createHash('sha256').update(roomName).digest();
    
    const discovery = swarm.join(currentRoom, { lookup: true, announce: true });
    
    console.log(`[*] Вход в комнату: ${roomName}`);
    console.log(`[*] Ожидание пиров...\n`);
    rl.prompt();

    swarm.on('connection', (socket) => {
        socket.on('data', (data) => {
            const decrypted = crypt(data, currentRoom).toString();
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            console.log(decrypted);
            rl.prompt();
        });
    });

    rl.on('line', (line) => {
        const msg = line.trim();
        if (!msg) return rl.prompt();

        if (msg.startsWith('/')) {
            const [cmd, arg] = msg.split(' ');
            if (cmd === '/nick' && arg) {
                nickname = arg;
                console.log(`[*] Ник изменен на: ${nickname}`);
            } else if (cmd === '/exit') {
                process.exit();
            } else if (cmd === '/peers') {
                console.log(`[*] Пиров в сети: ${swarm.connections.size}`);
            }
            rl.prompt();
            return;
        }

        const formattedMsg = `[${nickname}]: ${msg}`;
        const encrypted = crypt(b4a.from(formattedMsg), currentRoom);

        for (const socket of swarm.connections) {
            socket.write(encrypted);
        }
        rl.prompt();
    });
});
