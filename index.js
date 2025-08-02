const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Estado del bot para evitar spam de errores
let botStatus = {
  isHealthy: true,
  errorCount: 0,
  lastErrorTime: null,
  maintenanceMode: false
};

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Conectado a MongoDB Atlas');
}).catch(err => {
  console.error('❌ Error conectando a MongoDB:', err);
  botStatus.isHealthy = false;
  botStatus.maintenanceMode = true;
});

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log('🧠 Entró a /webhook');
  console.log('📦 Body:', req.body);
  
  // Verificar si el bot está en modo mantenimiento
  if (botStatus.maintenanceMode) {
    console.log('😴 Bot en modo mantenimiento, ignorando mensajes');
    res.sendStatus(200);
    return;
  }
  
  // Procesar el mensaje recibido
  const { data } = req.body;
  console.log('🔍 Data extraída:', data);
  
  if (data && data.personId && data.roomId && data.id) {
    console.log('✅ Datos válidos encontrados');
    const messageId = data.id;
    const personId = data.personId;
    const roomId = data.roomId;
    
    console.log(`📝 Mensaje recibido ID: ${messageId} de ${personId} en ${roomId}`);
    
    try {
      console.log('🔄 Intentando obtener contenido del mensaje...');
      // Obtener el contenido del mensaje desde la API de Webex
      const messageResponse = await fetch(`https://webexapis.com/v1/messages/${messageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WEBEX_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Respuesta de API recibida, status:', messageResponse.status);
      
      if (messageResponse.ok) {
        const messageData = await messageResponse.json();
        const messageText = messageData.text || '';
        
        console.log(`📄 Contenido del mensaje: "${messageText}"`);
        
        // Verificar si el mensaje es "hola"
        const message = messageText.toLowerCase().trim();
        console.log(`🔍 Mensaje procesado: "${message}"`);
        
        if (message === 'hola') {
          console.log('👋 Detectado saludo "hola"');
          
          // Guardar mensaje en BD
          await saveMessage(roomId, personId, 'user', messageText);
          
          const response = 'Hola, soy Sábilo! ¿En qué te puedo ayudar?';
          await saveMessage(roomId, personId, 'assistant', response);
          
          // Enviar respuesta
          await sendMessage(roomId, response);
        } else if (messageText.trim() !== '') {
          console.log('🤖 Procesando mensaje con Gemini...');
          
          // Guardar mensaje del usuario
          await saveMessage(roomId, personId, 'user', messageText);
          
          // Obtener historial de conversación
          const conversation = await getConversationHistory(roomId, personId);
          
          // Obtener respuesta de Gemini con contexto
          const geminiResponse = await getGeminiResponse(messageText, conversation);
          
          // Guardar respuesta del asistente
          await saveMessage(roomId, personId, 'assistant', geminiResponse);
          
          await sendMessage(roomId, geminiResponse);
        } else {
          console.log('❌ Mensaje vacío, ignorando');
        }
      } else {
        console.error('❌ Error al obtener mensaje:', messageResponse.statusText);
        const errorText = await messageResponse.text();
        console.error('❌ Error details:', errorText);
        await handleError(roomId, 'Error al obtener mensaje de Webex');
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);
      await handleError(roomId, 'Error interno del servidor');
    }
  } else {
    console.log('❌ Datos inválidos o faltantes en el webhook');
    console.log('data.personId:', data?.personId);
    console.log('data.roomId:', data?.roomId);
    console.log('data.id:', data?.id);
  }
  
  console.log('🏁 Finalizando webhook');
  res.sendStatus(200);
});

// Función para manejar errores y evitar spam
async function handleError(roomId, errorType) {
  const now = Date.now();
  
  // Si es el primer error o han pasado más de 5 minutos desde el último
  if (botStatus.errorCount === 0 || (now - botStatus.lastErrorTime) > 5 * 60 * 1000) {
    botStatus.errorCount++;
    botStatus.lastErrorTime = now;
    
    // Si es el primer error, enviar mensaje de mantenimiento
    if (botStatus.errorCount === 1) {
      console.log('⚠️ Primer error detectado, enviando mensaje de mantenimiento');
      await sendMessage(roomId, '😴 Sábilo está durmiendo y en mantenimiento, ¡comunícate más tarde!');
    }
    
    // Si hay más de 3 errores en 5 minutos, activar modo mantenimiento
    if (botStatus.errorCount >= 3) {
      console.log('🚨 Muchos errores detectados, activando modo mantenimiento');
      botStatus.maintenanceMode = true;
      botStatus.isHealthy = false;
    }
  } else {
    console.log('🤐 Error ignorado para evitar spam');
  }
}

// Función para guardar mensaje en BD
async function saveMessage(roomId, personId, role, content) {
  try {
    let conversation = await Conversation.findOne({ roomId, personId });
    
    if (!conversation) {
      conversation = new Conversation({ roomId, personId, messages: [] });
    }
    
    await conversation.addMessage(role, content);
    console.log(`💾 Mensaje guardado: ${role} - ${content.substring(0, 50)}...`);
  } catch (error) {
    console.error('❌ Error guardando mensaje:', error);
  }
}

// Función para obtener historial de conversación
async function getConversationHistory(roomId, personId) {
  try {
    const conversation = await Conversation.findOne({ roomId, personId });
    if (conversation && conversation.messages.length > 0) {
      return conversation.getFormattedHistory();
    }
    return '';
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    return '';
  }
}

// Función para obtener respuesta de Gemini con contexto
async function getGeminiResponse(userMessage, conversationHistory) {
  try {
    console.log('🤖 Enviando mensaje a Gemini:', userMessage);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let prompt = `Eres Sábilo, un asistente virtual amigable y útil. Responde de manera clara, concisa y amigable.`;
    
    if (conversationHistory) {
      prompt += `\n\nConversación anterior:\n${conversationHistory}\n\nMensaje actual del usuario: ${userMessage}`;
    } else {
      prompt += `\n\nMensaje del usuario: ${userMessage}`;
    }
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Respuesta de Gemini:', text);
    return text;
  } catch (error) {
    console.error('❌ Error al obtener respuesta de Gemini:', error);
    throw new Error('Error de Gemini');
  }
}

// Función para enviar mensajes a Webex
async function sendMessage(roomId, text) {
  try {
    const response = await fetch(`https://webexapis.com/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WEBEX_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomId: roomId,
        text: text
      })
    });
    
    if (response.ok) {
      console.log('✅ Mensaje enviado exitosamente');
    } else {
      console.error('❌ Error al enviar mensaje:', response.statusText);
      throw new Error('Error enviando mensaje a Webex');
    }
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    throw error;
  }
}

app.get('/', (req, res) => {
res.send('¡Sábilo está despierto!');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

// Endpoint para verificar estado del bot
app.get('/status', (req, res) => {
  res.json({
    status: botStatus.maintenanceMode ? 'maintenance' : 'healthy',
    errorCount: botStatus.errorCount,
    lastErrorTime: botStatus.lastErrorTime,
    isHealthy: botStatus.isHealthy
  });
});

// Endpoint para resetear el bot (para debugging)
app.post('/reset', (req, res) => {
  botStatus = {
    isHealthy: true,
    errorCount: 0,
    lastErrorTime: null,
    maintenanceMode: false
  };
  console.log('🔄 Bot reseteado manualmente');
  res.json({ message: 'Bot reseteado', status: botStatus });
});

app.listen(PORT, () => {
console.log(`Servidor corriendo en puerto ${PORT}`);
});
