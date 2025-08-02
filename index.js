const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log('🧠 Entró a /webhook');
  console.log('📦 Body:', req.body);
  
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
          
          // Enviar respuesta
          await sendMessage(roomId, 'Hola, soy Sábilo! ¿En qué te puedo ayudar?');
        } else if (messageText.trim() !== '') {
          console.log('🤖 Procesando mensaje con Gemini...');
          
          // Obtener respuesta de Gemini
          const geminiResponse = await getGeminiResponse(messageText);
          await sendMessage(roomId, geminiResponse);
        } else {
          console.log('❌ Mensaje vacío, ignorando');
        }
      } else {
        console.error('❌ Error al obtener mensaje:', messageResponse.statusText);
        const errorText = await messageResponse.text();
        console.error('❌ Error details:', errorText);
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);
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

// Función para obtener respuesta de Gemini
async function getGeminiResponse(userMessage) {
  try {
    console.log('🤖 Enviando mensaje a Gemini:', userMessage);
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Eres Sábilo, un asistente virtual amigable y útil. Responde de manera clara, concisa y amigable. 
    
    Mensaje del usuario: ${userMessage}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Respuesta de Gemini:', text);
    return text;
  } catch (error) {
    console.error('❌ Error al obtener respuesta de Gemini:', error);
    return 'Lo siento, estoy teniendo problemas para procesar tu mensaje. ¿Podrías intentar de nuevo?';
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
    }
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
  }
}

app.get('/', (req, res) => {
res.send('¡Sábilo está despierto!');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(PORT, () => {
console.log(`Servidor corriendo en puerto ${PORT}`);
});
