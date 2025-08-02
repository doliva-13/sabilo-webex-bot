const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  console.log('🧠 Entró a /webhook');
  console.log('📦 Body:', req.body);
  
  // Procesar el mensaje recibido
  const { data } = req.body;
  
  if (data && data.personId && data.roomId && data.text) {
    const message = data.text.toLowerCase().trim();
    const personId = data.personId;
    const roomId = data.roomId;
    
    console.log(`📝 Mensaje recibido: "${data.text}" de ${personId} en ${roomId}`);
    
    // Verificar si el mensaje es "hola"
    if (message === 'hola') {
      console.log('👋 Detectado saludo "hola"');
      
      // Enviar respuesta
      sendMessage(roomId, 'Hola, soy Sábilo! ¿En qué te puedo ayudar?');
    }
  }
  
  res.sendStatus(200);
});

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
