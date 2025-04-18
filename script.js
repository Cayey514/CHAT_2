
// Variables globales
const socket = io();
let currentUser = {};
let lastDateDisplayed = null;

// Elementos del DOM
const authEl = document.getElementById('auth');
const chatContainerEl = document.getElementById('chat-container');
const chatEl = document.getElementById('chat');
const messageFormEl = document.getElementById('message-form');
const messageInputEl = document.getElementById('message-input');
const usernameEl = document.getElementById('username');
const registerBtnEl = document.getElementById('register-btn');

// Event Listeners
registerBtnEl.addEventListener('click', registerUser);
messageFormEl.addEventListener('submit', sendMessage);
messageInputEl.addEventListener('input', handleTyping);

// Socket.io listeners
socket.on('registered', handleRegistered);
socket.on('newMessage', addMessage);
socket.on('messageHistory', initChat);
socket.on('typingUpdate', updateTypingIndicator);

// Funciones principales
function registerUser() {
  const username = usernameEl.value.trim();
  if (username) {
    socket.emit('register', username);
  }
}

function handleRegistered(user) {
  currentUser = user;
  authEl.style.display = 'none';
  chatContainerEl.style.display = 'flex';
  messageInputEl.focus();
}

function sendMessage(e) {
  e.preventDefault();
  const content = messageInputEl.value.trim();
  if (content) {
    socket.emit('sendMessage', content);
    messageInputEl.value = '';
  }
}

function handleTyping() {
  const isTyping = messageInputEl.value.trim().length > 0;
  socket.emit('typing', isTyping);
}

function initChat(messages) {
  messages.forEach(msg => addMessage(msg, false));
}

function addMessage(message, checkDate = true) {
  const isCurrentUser = message.user.username === currentUser.username;
  
  // Mostrar fecha si cambió
  if (checkDate && message.date !== lastDateDisplayed) {
    addDateDivider(message.date);
    lastDateDisplayed = message.date;
  }
  
  const messageEl = document.createElement('div');
  messageEl.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
  
  messageEl.innerHTML = `
    <div class="message-header">
      <span class="username">${message.user.username}</span>
      <small class="timestamp">${message.timestamp}</small>
    </div>
    <div class="message-content">${message.content}</div>
  `;
  
  // Color para mensajes recibidos
  if (!isCurrentUser) {
    messageEl.querySelector('.username').style.color = message.user.color;
    messageEl.querySelector('.message-content').style.color = message.user.color;
  }
  
  chatEl.appendChild(messageEl);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function addDateDivider(dateString) {
  const dividerEl = document.createElement('div');
  dividerEl.className = 'date-divider';
  dividerEl.innerHTML = `<span>${dateString}</span>`;
  chatEl.appendChild(dividerEl);
}

function updateTypingIndicator(usernames) {
  // Eliminar indicador anterior
  const existingTyping = document.getElementById('typing-indicator');
  if (existingTyping) existingTyping.remove();
  
  // Mostrar nuevo indicador si hay usuarios escribiendo
  if (usernames.length > 0) {
    const typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator';
    typingEl.className = 'typing-indicator';
    typingEl.innerHTML = `
      ${usernames.join(', ')} ${usernames.length > 1 ? 'están escribiendo' : 'está escribiendo'}
      <span></span><span></span><span></span>
    `;
    chatEl.appendChild(typingEl);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
}
