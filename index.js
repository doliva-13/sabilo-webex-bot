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
  maintenanceMode: false,
  maintenanceResponses: new Set(), // Track de mensajes ya respondidos en mantenimiento
  currentIP: null, // IP actual del servidor
  lastIPCheck: 0 // Timestamp del último check de IP
};

// Función para obtener IP actual del servidor
async function getCurrentIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('❌ Error obteniendo IP actual:', error);
    return null;
  }
}

// Función para verificar si una IP está en la whitelist de MongoDB Atlas
async function isIPWhitelisted(ip) {
  try {
    console.log(`🔍 Verificando si IP ${ip} está en whitelist...`);
    
    // Verificar si tenemos las credenciales necesarias
    if (!process.env.MONGODB_ATLAS_API_KEY || !process.env.MONGODB_ATLAS_ORG_ID) {
      console.log('⚠️ Faltan credenciales de MongoDB Atlas API');
      return false;
    }
    
    const response = await fetch(`https://cloud.mongodb.com/api/atlas/v1.0/orgs/${process.env.MONGODB_ATLAS_ORG_ID}/accessList`, {
      headers: {
        'Authorization': `Bearer ${process.env.MONGODB_ATLAS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const isWhitelisted = data.results.some(entry => entry.ipAddress === ip);
      console.log(`🔍 IP ${ip} ${isWhitelisted ? 'está' : 'NO está'} en whitelist`);
      return isWhitelisted;
    } else {
      console.error('❌ Error verificando whitelist:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando whitelist:', error);
    return false;
  }
}

// Función para agregar IP automáticamente a MongoDB Atlas
async function addIPToMongoDBAtlas(ip) {
  try {
    console.log(`🔄 Agregando IP ${ip} a MongoDB Atlas automáticamente...`);
    
    // Verificar si tenemos las credenciales necesarias
    if (!process.env.MONGODB_ATLAS_API_KEY || !process.env.MONGODB_ATLAS_ORG_ID) {
      console.log('⚠️ Faltan credenciales de MongoDB Atlas API');
      console.log('📝 Configura MONGODB_ATLAS_API_KEY y MONGODB_ATLAS_ORG_ID en Render');
      return false;
    }
    
    const response = await fetch(`https://cloud.mongodb.com/api/atlas/v1.0/orgs/${process.env.MONGODB_ATLAS_ORG_ID}/accessList`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MONGODB_ATLAS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ipAddress: ip,
        comment: `Auto-added by Sábilo Bot at ${new Date().toISOString()}`
      })
    });
    
    if (response.ok) {
      console.log(`✅ IP ${ip} agregada exitosamente a MongoDB Atlas`);
      return true;
    } else {
      const errorData = await response.text();
      console.error(`❌ Error agregando IP ${ip}:`, response.statusText, errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ Error agregando IP a MongoDB Atlas:', error);
    return false;
  }
}

// Función para actualizar IP en MongoDB Atlas
async function updateMongoDBIP(newIP) {
  try {
    console.log(`🔄 Verificando IP en MongoDB Atlas: ${newIP}`);
    
    // Verificar si ya está whitelisted
    const isWhitelisted = await isIPWhitelisted(newIP);
    
    if (isWhitelisted) {
      console.log(`✅ IP ${newIP} ya está en la whitelist de MongoDB Atlas`);
      return true;
    } else {
      console.log(`⚠️ IP ${newIP} NO está en la whitelist de MongoDB Atlas`);
      
      // Intentar agregar automáticamente
      const added = await addIPToMongoDBAtlas(newIP);
      
      if (added) {
        console.log(`✅ IP ${newIP} agregada automáticamente a MongoDB Atlas`);
        console.log(`🔄 Esperando 30 segundos para que se propague...`);
        
        // Esperar 30 segundos para que la IP se propague
        setTimeout(async () => {
          console.log(`🔍 Verificando si la IP ${newIP} ya está activa...`);
          const isNowWhitelisted = await isIPWhitelisted(newIP);
          if (isNowWhitelisted) {
            console.log(`✅ IP ${newIP} confirmada como activa en MongoDB Atlas`);
          } else {
            console.log(`⚠️ IP ${newIP} aún no está activa, puede tomar más tiempo`);
          }
        }, 30000);
        
        return true;
      } else {
        console.log(`❌ No se pudo agregar IP ${newIP} automáticamente`);
        console.log(`📝 INSTRUCCIONES manuales para agregar IP:`);
        console.log(`   1. Ve a MongoDB Atlas Dashboard`);
        console.log(`   2. Selecciona tu cluster`);
        console.log(`   3. Ve a "Network Access"`);
        console.log(`   4. Haz clic en "Add IP Address"`);
        console.log(`   5. Agrega esta IP: ${newIP}`);
        console.log(`   6. Haz clic en "Confirm"`);
        console.log(`   7. Espera 1-2 minutos`);
        console.log(`   8. El bot se reconectará automáticamente`);
        
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Error actualizando IP en MongoDB:', error);
    return false;
  }
}

// Función para verificar y actualizar IP
async function checkAndUpdateIP() {
  const now = Date.now();
  
  // Verificar IP cada 5 minutos
  if (now - botStatus.lastIPCheck > 5 * 60 * 1000) {
    console.log('🔍 Verificando IP actual...');
    
    const currentIP = await getCurrentIP();
    
    if (currentIP && currentIP !== botStatus.currentIP) {
      console.log(`🔄 IP cambió: ${botStatus.currentIP} → ${currentIP}`);
      botStatus.currentIP = currentIP;
      
      // Actualizar en MongoDB Atlas
      await updateMongoDBIP(currentIP);
    } else if (currentIP) {
      console.log(`✅ IP sin cambios: ${currentIP}`);
    }
    
    botStatus.lastIPCheck = now;
  }
}

// Conectar a MongoDB
console.log('🔍 Verificando MONGODB_URI:', process.env.MONGODB_URI ? '✅ Definida' : '❌ No definida');
console.log('🔍 Verificando GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Definida' : '❌ No definida');
console.log('🔍 Verificando WEBEX_ACCESS_TOKEN:', process.env.WEBEX_ACCESS_TOKEN ? '✅ Definida' : '❌ No definida');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}).then(() => {
  console.log('✅ Conectado a MongoDB Atlas');
}).catch(err => {
  console.error('❌ Error conectando a MongoDB:', err);
  console.error('🚨 ACTIVANDO MODO MANTENIMIENTO por error de MongoDB');
  botStatus.isHealthy = false;
  botStatus.maintenanceMode = true;
});

// Manejar eventos de conexión
mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión MongoDB:', err);
  console.error('🚨 ACTIVANDO MODO MANTENIMIENTO por error de conexión MongoDB');
  botStatus.isHealthy = false;
  botStatus.maintenanceMode = true;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado');
  console.log('🚨 ACTIVANDO MODO MANTENIMIENTO por desconexión de MongoDB');
  botStatus.isHealthy = false;
  botStatus.maintenanceMode = true;
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB reconectado');
  botStatus.isHealthy = true;
  botStatus.maintenanceMode = false;
});

// Limpiar tracking de mensajes respondidos cada hora
setInterval(() => {
  if (botStatus.maintenanceResponses.size > 100) {
    console.log('🧹 Limpiando tracking de mensajes respondidos en mantenimiento');
    botStatus.maintenanceResponses.clear();
  }
}, 60 * 60 * 1000); // Cada hora

// Check inicial de IP
setTimeout(async () => {
  console.log('🚀 Iniciando check inicial de IP...');
  await checkAndUpdateIP();
}, 10000); // 10 segundos después del inicio

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log('🧠 Entró a /webhook');
  console.log('📦 Body:', req.body);
  
  // Log de IP para identificar IPs de Render
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('🌐 IP del cliente:', clientIP);
  
  // Verificar y actualizar IP automáticamente
  await checkAndUpdateIP();
  
  // Procesar el mensaje recibido
  const { data } = req.body;
  console.log('🔍 Data extraída:', data);
  
  if (data && data.personId && data.roomId && data.id) {
    console.log('✅ Datos válidos encontrados');
    const messageId = data.id;
    const personId = data.personId;
    const roomId = data.roomId;
    
    console.log(`📝 Mensaje recibido ID: ${messageId} de ${personId} en ${roomId}`);
    
    // Verificar si el bot está en modo mantenimiento
    if (botStatus.maintenanceMode) {
      console.log('😴 Bot en modo mantenimiento, verificando si debe responder');
      
      // Crear un identificador único para este mensaje
      const messageKey = `${messageId}-${personId}-${roomId}`;
      
      // Verificar si ya respondimos a este mensaje específico
      if (botStatus.maintenanceResponses.has(messageKey)) {
        console.log('🤐 Mensaje ya respondido en mantenimiento, ignorando');
        res.sendStatus(200);
        return;
      }
      
      try {
        // Obtener el contenido del mensaje para verificar si es nuevo
        const messageResponse = await fetch(`https://webexapis.com/v1/messages/${messageId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.WEBEX_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (messageResponse.ok) {
          const messageData = await messageResponse.json();
          const messageText = messageData.text || '';
          
          // Solo responder si el mensaje no está vacío
          if (messageText.trim() !== '') {
            console.log('😴 Enviando mensaje de mantenimiento al usuario');
            await sendMessage(roomId, '😴 Sábilo está durmiendo y en mantenimiento, ¡comunícate más tarde!');
            
            // Marcar este mensaje como ya respondido
            botStatus.maintenanceResponses.add(messageKey);
            console.log(`📝 Marcado mensaje ${messageKey} como respondido`);
          } else {
            console.log('🤐 Ignorando mensaje vacío');
          }
        }
      } catch (error) {
        console.error('❌ Error verificando mensaje en modo mantenimiento:', error);
      }
      
      res.sendStatus(200);
      return;
    }
    
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
          
          const response = 'Hola, soy Sábilo! ¿En qué te puedo ayudar?';
          
          // Enviar respuesta inmediatamente
          await sendMessage(roomId, response);
          
          // Guardar en paralelo (no esperar)
          saveMessage(roomId, personId, 'user', messageText).catch(err => 
            console.error('❌ Error guardando mensaje usuario:', err.message)
          );
          saveMessage(roomId, personId, 'assistant', response).catch(err => 
            console.error('❌ Error guardando respuesta asistente:', err.message)
          );
          
        } else if (messageText.trim() !== '') {
          console.log('🤖 Procesando mensaje con Gemini...');
          
          // Guardar mensaje del usuario en paralelo
          saveMessage(roomId, personId, 'user', messageText).catch(err => 
            console.error('❌ Error guardando mensaje usuario:', err.message)
          );
          
          // Obtener historial de conversación (esto sí necesitamos esperar)
          const conversation = await getConversationHistory(roomId, personId);
          
          // Obtener respuesta de Gemini con contexto
          const geminiResponse = await getGeminiResponse(messageText, conversation);
          
          // Enviar respuesta inmediatamente
          await sendMessage(roomId, geminiResponse);
          
          // Guardar respuesta del asistente en paralelo
          saveMessage(roomId, personId, 'assistant', geminiResponse).catch(err => 
            console.error('❌ Error guardando respuesta asistente:', err.message)
          );
          
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
  
  console.log(`🚨 Error detectado: ${errorType}`);
  
  // Si es el primer error o han pasado más de 5 minutos desde el último
  if (botStatus.errorCount === 0 || (now - botStatus.lastErrorTime) > 5 * 60 * 1000) {
    botStatus.errorCount++;
    botStatus.lastErrorTime = now;
    
    console.log(`📊 Contador de errores: ${botStatus.errorCount}/3`);
    
    // Si es el primer error, enviar mensaje de mantenimiento
    if (botStatus.errorCount === 1) {
      console.log('⚠️ Primer error detectado, enviando mensaje de mantenimiento');
      await sendMessage(roomId, '😴 Sábilo está durmiendo y en mantenimiento, ¡comunícate más tarde!');
    }
    
    // Si hay más de 3 errores en 5 minutos, activar modo mantenimiento
    if (botStatus.errorCount >= 3) {
      console.log('🚨 Muchos errores detectados, activando modo mantenimiento');
      console.log(`🚨 CAUSA: ${errorType} (${botStatus.errorCount} errores en 5 minutos)`);
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
    // Verificar si MongoDB está conectado
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ MongoDB no está conectado, saltando guardado');
      return;
    }

    let conversation = await Conversation.findOne({ roomId, personId }).maxTimeMS(5000);
    
    if (!conversation) {
      conversation = new Conversation({ roomId, personId, messages: [] });
    }
    
    await conversation.addMessage(role, content);
    console.log(`💾 Mensaje guardado: ${role} - ${content.substring(0, 50)}...`);
  } catch (error) {
    console.error('❌ Error guardando mensaje:', error.message);
    // No lanzar error para no interrumpir el flujo
  }
}

// Función para obtener historial de conversación
async function getConversationHistory(roomId, personId) {
  try {
    // Verificar si MongoDB está conectado
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ MongoDB no está conectado, sin historial');
      return '';
    }

    const conversation = await Conversation.findOne({ roomId, personId }).maxTimeMS(5000);
    if (conversation && conversation.messages.length > 0) {
      return conversation.getFormattedHistory();
    }
    return '';
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error.message);
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

// Endpoint para mostrar IP actual
app.get('/ip', (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const serverIP = req.connection.localAddress;
  const realIP = req.headers['x-real-ip'];
  const forwardedIP = req.headers['x-forwarded-for'];
  
  res.json({
    clientIP: clientIP,
    serverIP: serverIP,
    realIP: realIP,
    forwardedIP: forwardedIP,
    allIPs: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'x-client-ip': req.headers['x-client-ip'],
      'cf-connecting-ip': req.headers['cf-connecting-ip'],
      'remote-addr': req.connection.remoteAddress
    },
    headers: req.headers,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    note: 'Agrega estas IPs a MongoDB Atlas Network Access'
  });
});

// Endpoint para generar instrucciones de MongoDB
app.get('/mongodb-setup', (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const ipParts = clientIP ? clientIP.split(',')[0].trim() : 'unknown';
  
  res.json({
    instructions: [
      '1. Ve a MongoDB Atlas Dashboard',
      '2. Selecciona tu cluster',
      '3. Ve a "Network Access"',
      '4. Haz clic en "Add IP Address"',
      '5. Agrega estas IPs:',
      `   - ${ipParts}`,
      '   - 0.0.0.0/0 (temporal, para desarrollo)',
      '6. Haz clic en "Confirm"',
      '7. Espera 1-2 minutos',
      '8. El bot se reconectará automáticamente'
    ],
    currentIP: ipParts,
    warning: 'Las IPs pueden cambiar en reinicios. Para producción, considera usar 0.0.0.0/0 temporalmente.'
  });
});

// Endpoint para mostrar estado de IPs
app.get('/ip-status', async (req, res) => {
  const isWhitelisted = botStatus.currentIP ? await isIPWhitelisted(botStatus.currentIP) : false;
  const hasApiCredentials = !!(process.env.MONGODB_ATLAS_API_KEY && process.env.MONGODB_ATLAS_ORG_ID);
  
  res.json({
    currentIP: botStatus.currentIP,
    isWhitelisted: isWhitelisted,
    hasApiCredentials: hasApiCredentials,
    lastIPCheck: new Date(botStatus.lastIPCheck).toISOString(),
    nextCheck: new Date(botStatus.lastIPCheck + 5 * 60 * 1000).toISOString(),
    status: isWhitelisted ? 'ready' : 'needs_whitelist',
    autoSetup: hasApiCredentials ? 'enabled' : 'disabled',
    instructions: botStatus.currentIP ? [
      isWhitelisted ? 
        `✅ IP ${botStatus.currentIP} ya está en MongoDB Atlas` :
        `⚠️ IP ${botStatus.currentIP} necesita ser agregada a MongoDB Atlas`,
      hasApiCredentials ? 
        '🤖 Configuración automática habilitada - el bot agregará IPs automáticamente' :
        '📝 Configuración manual requerida - ve a /mongodb-atlas-setup para instrucciones',
      '1. Ve a MongoDB Atlas → Network Access',
      `2. ${isWhitelisted ? 'IP ya configurada' : `Agrega esta IP: ${botStatus.currentIP}`}`,
      '3. El bot detectará cambios automáticamente',
      '4. Revisa los logs para ver nuevas IPs'
    ] : [
      '1. Espera 10 segundos para el check inicial',
      '2. Revisa los logs para ver la IP actual',
      '3. Agrega la IP a MongoDB Atlas'
    ],
    note: hasApiCredentials ? 
      'El bot agregará IPs automáticamente cuando cambien' : 
      'Configura las credenciales de MongoDB Atlas API para agregar IPs automáticamente'
  });
});

// Endpoint para resetear el bot (para debugging)
app.post('/reset', (req, res) => {
  botStatus = {
    isHealthy: true,
    errorCount: 0,
    lastErrorTime: null,
    maintenanceMode: false,
    maintenanceResponses: new Set()
  };
  console.log('🔄 Bot reseteado manualmente');
  res.json({ message: 'Bot reseteado', status: botStatus });
});

// Endpoint para forzar verificación de IP
app.post('/check-ip', async (req, res) => {
  console.log('🔍 Forzando verificación de IP...');
  await checkAndUpdateIP();
  
  const isWhitelisted = botStatus.currentIP ? await isIPWhitelisted(botStatus.currentIP) : false;
  
  res.json({
    message: 'Verificación de IP completada',
    currentIP: botStatus.currentIP,
    isWhitelisted: isWhitelisted,
    status: isWhitelisted ? 'ready' : 'needs_whitelist',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para mostrar configuración de MongoDB Atlas API
app.get('/mongodb-atlas-setup', (req, res) => {
  const hasApiKey = !!process.env.MONGODB_ATLAS_API_KEY;
  const hasOrgId = !!process.env.MONGODB_ATLAS_ORG_ID;
  
  res.json({
    status: hasApiKey && hasOrgId ? 'configured' : 'missing_credentials',
    hasApiKey: hasApiKey,
    hasOrgId: hasOrgId,
    instructions: [
      'Para agregar IPs automáticamente, configura estas variables en Render:',
      '',
      '1. MONGODB_ATLAS_API_KEY:',
      '   - Ve a MongoDB Atlas → Access Manager → API Keys',
      '   - Crea una nueva API Key con permisos de "Organization Owner"',
      '   - Copia la API Key y agrégala a Render',
      '',
      '2. MONGODB_ATLAS_ORG_ID:',
      '   - Ve a MongoDB Atlas → Settings → General',
      '   - Copia el "Organization ID"',
      '   - Agrégala a Render como MONGODB_ATLAS_ORG_ID',
      '',
      '3. Reinicia el bot después de configurar las variables',
      '',
      'Una vez configurado, el bot agregará IPs automáticamente cuando cambien.'
    ],
    note: 'Las credenciales son necesarias para agregar IPs automáticamente'
  });
});

app.listen(PORT, () => {
console.log(`Servidor corriendo en puerto ${PORT}`);
});
