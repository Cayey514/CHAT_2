require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
import { Server } from 'socket.io';

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? ["https://tuchat.onrender.com"] 
      : "*",
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling']
  }
});

// Manejo de conexiones
io.on('connection', (socket) => {
  console.log('✅ Nuevo cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// Almacenamiento en memoria (para demo)
const users = {};
const messages = [];
const typingUsers = new Set();

// Servir frontend
app.use(express.static(path.join(__dirname, '/')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// WebSocket events
io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado');
  
  // Enviar historial
  socket.emit('messageHistory', messages);
  
  // Registrar usuario
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
  
  // Manejar mensajes
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
  
  // Typing indicator
  socket.on('typing', (isTyping) => {
    updateTypingUsers(socket.id, isTyping);
  });
  
  // Desconexión
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

const { RateLimiterMemory } = require('rate-limiter-flexible');
const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 conexiones
  duration: 1 // por segundo
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));