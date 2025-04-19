import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RateLimiterMemory } from 'rate-limiter-flexible';

dotenv.config();

// Estas líneas son necesarias en ES Modules para obtener __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? ["https://tuchat.onrender.com"] 
      : "*",
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling']
  }
});

// Conexión inicial
io.on('connection', (socket) => {
  console.log('✅ Nuevo cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// Almacenamiento en memoria
const users = {};
const messages = [];
const typingUsers = new Set();

// Servir frontend
app.use(express.static(path.join(__dirname, '/')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// WebSocket events
io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado');
  
  socket.emit('messageHistory', messages);
  
  socket.on('register', (username) => {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3'];
    users[socket.id] = {
      username,
      color: colors[Object.keys(users).length % colors.length],
      socketId: socket.id
    };
    socket.emit('registered', users[socket.id]);
    io.emit('userList', Object.values(users));
  });

  socket.on('sendMessage', (content) => {
    if (!users[socket.id] || !content.trim()) return;
    
    const message = {
      user: users[socket.id],
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString()
    };
    
    messages.push(message);
    io.emit('newMessage', message);
    updateTypingUsers(socket.id, false);
  });

  socket.on('typing', (isTyping) => {
    updateTypingUsers(socket.id, isTyping);
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      delete users[socket.id];
      io.emit('userList', Object.values(users));
      updateTypingUsers(socket.id, false);
    }
  });

  function updateTypingUsers(socketId, isTyping) {
    const user = users[socketId];
    if (!user) return;

    if (isTyping) {
      typingUsers.add(user.username);
    } else {
      typingUsers.delete(user.username);
    }

    io.emit('typingUpdate', Array.from(typingUsers));
  }
});

// Limitar conexiones
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 1
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
