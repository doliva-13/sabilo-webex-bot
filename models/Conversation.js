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
  },
  messageId: {
    type: String,
    required: true
  }
});

const conversationSchema = new mongoose.Schema({
  // Identificadores principales
  roomId: {
    type: String,
    required: true,
    index: true
  },
  personId: {
    type: String,
    required: true,
    index: true
  },
  
  // Identificadores adicionales para mejor tracking
  personEmail: {
    type: String,
    index: true
  },
  personDisplayName: {
    type: String
  },
  
  // Metadatos de la conversación
  messages: [messageSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Configuración de memoria
  maxMessages: {
    type: Number,
    default: 20  // Aumentado de 10 a 20
  },
  
  // Estado de la conversación
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Estadísticas
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
});

// Índices compuestos para búsquedas eficientes
conversationSchema.index({ roomId: 1, personId: 1 });
conversationSchema.index({ personEmail: 1, lastUpdated: -1 });
conversationSchema.index({ lastUpdated: -1 });

// Método para agregar mensaje
conversationSchema.methods.addMessage = function(role, content, messageId = null) {
  const message = { 
    role, 
    content, 
    timestamp: new Date(),
    messageId: messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  this.messages.push(message);
  this.lastUpdated = new Date();
  this.lastMessageAt = new Date();
  this.messageCount++;
  
  // Mantener solo los últimos N mensajes
  if (this.messages.length > this.maxMessages) {
    this.messages = this.messages.slice(-this.maxMessages);
  }
  
  return this.save();
};

// Método para obtener historial formateado
conversationSchema.methods.getFormattedHistory = function() {
  return this.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
};

// Método para obtener historial con timestamps
conversationSchema.methods.getDetailedHistory = function() {
  return this.messages.map(msg => 
    `${msg.role} (${msg.timestamp.toLocaleString()}): ${msg.content}`
  ).join('\n');
};

// Método para limpiar mensajes antiguos
conversationSchema.methods.cleanOldMessages = function(daysToKeep = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  this.messages = this.messages.filter(msg => msg.timestamp > cutoffDate);
  return this.save();
};

// Método para obtener resumen de la conversación
conversationSchema.methods.getConversationSummary = function() {
  return {
    totalMessages: this.messageCount,
    lastMessage: this.messages[this.messages.length - 1]?.content || 'No hay mensajes',
    lastUpdated: this.lastUpdated,
    duration: this.lastUpdated - this.createdAt
  };
};

module.exports = mongoose.model('Conversation', conversationSchema); 