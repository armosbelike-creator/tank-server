const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Игровые данные
const players = {};
const bullets = [];
const shapes = {};

const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 3600;

// Создаем ресурсы (фигуры) для сбора
for (let i = 0; i < 60; i++) {
    let id = 'shape_' + Math.random().toString(36).substr(2, 9);
    shapes[id] = {
        id: id,
        x: Math.floor(Math.random() * (WORLD_WIDTH - 200)) + 100,
        y: Math.floor(Math.random() * (WORLD_HEIGHT - 200)) + 100,
        hp: 25
    };
}

io.on('connection', (socket) => {
    console.log(`Игрок подключился: ${socket.id}`);

    // Регистрируем нового игрока
    players[socket.id] = {
        id: socket.id,
        name: 'Танкист',
        x: Math.floor(Math.random() * (WORLD_WIDTH - 800)) + 400,
        y: Math.floor(Math.random() * (WORLD_HEIGHT - 800)) + 400,
        hp: 100,
        maxHp: 100,
        score: 0,
        turretRotation: 0
    };

    socket.on('init_player', (data) => {
        if (players[socket.id]) {
            players[socket.id].name = data.name || 'Танкист';
        }
    });

    socket.on('player_input', (data) => {
        let player = players[socket.id];
        if (!player) return;

        let speed = 230;
        let vx = 0;
        let vy = 0;

        if (data.left) vx = -speed;
        if (data.right) vx = speed;
        if (data.up) vy = -speed;
        if (data.down) vy = speed;

        player.x += vx * 0.016;
        player.y += vy * 0.016;
        player.turretRotation = data.turretRotation;

        // Границы карты
        player.x = Math.max(20, Math.min(WORLD_WIDTH - 20, player.x));
        player.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, player.y));
    });

    socket.on('shoot', (data) => {
        bullets.push({
            x: data.x,
            y: data.y,
            vx: Math.cos(data.angle) * 750,
            vy: Math.sin(data.angle) * 750,
            playerId: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log(`Игрок отключился: ${socket.id}`);
        delete players[socket.id];
    });
});

// Игровой цикл сервера (60 кадров в секунду)
setInterval(() => {
    // Движение пуль
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx * 0.016;
        b.y += b.vy * 0.016;

        if (b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
            bullets.splice(i, 1);
        }
    }

    // Отправляем актуальное состояние всем клиентам (без ботов)
    io.emit('server_update', {
        players: players,
        bullets: bullets,
        shapes: shapes
    });
}, 1000 / 60);

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});