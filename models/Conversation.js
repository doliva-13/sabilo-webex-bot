const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  personId: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Método para agregar mensaje
conversationSchema.methods.addMessage = function(role, content) {
  this.messages.push({ role, content });
  this.lastUpdated = new Date();
  
  // Mantener solo los últimos 10 mensajes para no sobrecargar
  if (this.messages.length > 10) {
    this.messages = this.messages.slice(-10);
  }
  
  return this.save();
};

// Método para obtener historial formateado
conversationSchema.methods.getFormattedHistory = function() {
  return this.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
};

module.exports = mongoose.model('Conversation', conversationSchema); 