require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const MESSAGES_FILE = 'messages.json';

// Cargar mensajes existentes
let messages = [];
if (fs.existsSync(MESSAGES_FILE)) {
  try {
    messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  } catch (err) {
    console.error('Error cargando mensajes:', err);
  }
}

// Configuración básica
app.use(express.static(path.join(__dirname, '/')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const users = {};

io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado');
  socket.emit('messageHistory', messages);
  
  socket.on('register', (username) => {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF'];
    users[socket.id] = {
      username,
      color: colors[Object.keys(users).length % colors.length]
    };
    socket.emit('registered', users[socket.id]);
  });
  
  socket.on('sendMessage', (content) => {
    if (!users[socket.id] || !content.trim()) return;
    
    const message = {
      user: users[socket.id],
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString()
    };
    
    messages.push(message);
    
    try {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages));
      io.emit('newMessage', message);
    } catch (err) {
      console.error('Error guardando mensaje:', err);
    }
  });
  
  socket.on('disconnect', () => {
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});