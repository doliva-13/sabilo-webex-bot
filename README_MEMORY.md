# 🧠 Sistema de Memoria Mejorado - Sábilo Bot

## 📊 **Estructura de Datos Actual**

### **🗄️ Base de Datos (MongoDB)**

```javascript
// Colección: conversations
{
  _id: ObjectId,
  
  // Identificadores principales
  roomId: "room123",           // ID del chat de Webex
  personId: "person456",       // ID del usuario en Webex
  
  // Identificadores adicionales
  personEmail: "user@email.com",     // Email del usuario (para mejor tracking)
  personDisplayName: "Juan Pérez",   // Nombre mostrado
  
  // Metadatos
  messages: [
    {
      role: "user",
      content: "Hola, ¿cómo estás?",
      timestamp: "2025-02-08T18:30:00Z",
      messageId: "msg_1707412200000_abc123"
    },
    {
      role: "assistant",
      content: "¡Hola! Estoy muy bien, ¿en qué puedo ayudarte?",
      timestamp: "2025-02-08T18:30:05Z",
      messageId: "msg_1707412205000_def456"
    }
  ],
  
  // Configuración
  maxMessages: 20,             // Máximo mensajes por conversación
  isActive: true,              // Estado de la conversación
  
  // Estadísticas
  messageCount: 15,            // Total de mensajes
  createdAt: "2025-02-08T18:30:00Z",
  lastUpdated: "2025-02-08T18:35:00Z",
  lastMessageAt: "2025-02-08T18:35:00Z"
}
```

## 🔄 **Flujo de Memoria Mejorado**

### **1. Almacenamiento Inteligente**

```javascript
// Cuando llega un mensaje:
1. Obtener información del usuario (email, nombre)
2. Buscar conversación existente por múltiples criterios:
   - roomId + personId (método actual)
   - personEmail (nuevo)
   - personId + conversaciones recientes (nuevo)
3. Si no se encuentra, crear nueva conversación
4. Guardar mensaje con messageId único
```

### **2. Recuperación Inteligente**

```javascript
// Antes de responder:
1. Buscar conversación por múltiples criterios
2. Si se encuentra en otro roomId, actualizar roomId
3. Obtener historial formateado
4. Construir prompt con contexto completo
```

### **3. Búsqueda por Múltiples Criterios**

```javascript
// Orden de búsqueda:
1. roomId + personId (método actual)
2. personEmail (si está disponible)
3. personId + conversaciones recientes (últimas 24h)
4. Si no se encuentra, crear nueva conversación
```

## 🎯 **Mejoras Implementadas**

### **✅ Problemas Resueltos:**

1. **Persistencia entre reinicios** - Los datos se mantienen en MongoDB
2. **Búsqueda por email** - Si roomId cambia, busca por email
3. **Conversaciones recientes** - Encuentra conversaciones de las últimas 24h
4. **Más mensajes** - Aumentado de 10 a 20 mensajes por conversación
5. **Mejor tracking** - messageId único para cada mensaje
6. **Estadísticas** - Contador de mensajes y timestamps

### **🔍 Logs Mejorados:**

```
👤 Información del usuario obtenida: Juan Pérez (juan@email.com)
✅ Conversación encontrada por email: 507f1f77bcf86cd799439011
📚 Historial recuperado: 15 líneas
💾 Mensaje guardado exitosamente: user - Hola, ¿cómo estás?...
```

## 📈 **Endpoints Nuevos**

### **1. Estadísticas de Conversación**
```
GET /conversation-stats/:roomId/:personId
```

**Respuesta:**
```json
{
  "roomId": "room123",
  "personId": "person456",
  "stats": {
    "totalMessages": 15,
    "lastMessage": "Hola, ¿cómo estás?",
    "lastUpdated": "2025-02-08T18:35:00Z",
    "duration": 300000
  },
  "recentConversations": [
    {
      "id": "507f1f77bcf86cd799439011",
      "roomId": "room123",
      "messageCount": 15,
      "lastUpdated": "2025-02-08T18:35:00Z",
      "isActive": true
    }
  ]
}
```

### **2. Limpiar Conversaciones Antiguas**
```
POST /cleanup-conversations
Body: { "daysToKeep": 7 }
```

## 🧹 **Limpieza Automática**

### **Configuración:**
- **Conversaciones activas**: Últimas 7 días
- **Mensajes por conversación**: Máximo 20
- **Limpieza automática**: Conversaciones de más de 7 días se marcan como inactivas

### **Comando manual:**
```bash
curl -X POST https://tu-bot.onrender.com/cleanup-conversations \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 7}'
```

## 🔧 **Configuración**

### **Variables de Entorno:**
```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# Webex
WEBEX_ACCESS_TOKEN=Bearer...

# Gemini
GEMINI_API_KEY=...
```

### **Configuración de Memoria:**
```javascript
// En models/Conversation.js
maxMessages: 20,        // Mensajes por conversación
daysToKeep: 7,          // Días para limpiar conversaciones
```

## 📊 **Monitoreo**

### **Logs Importantes:**
```
✅ Conversación encontrada por roomId/personId: 507f1f77bcf86cd799439011
✅ Conversación encontrada por email: 507f1f77bcf86cd799439011
✅ Conversación reciente encontrada: 507f1f77bcf86cd799439011
📚 Historial recuperado: 15 mensajes
💾 Mensaje guardado exitosamente: user - Hola...
🧹 Limpiadas 5 conversaciones antiguas
```

### **Estadísticas Disponibles:**
- Total de mensajes por conversación
- Duración de la conversación
- Último mensaje
- Conversaciones recientes del usuario

## 🚀 **Beneficios**

### **✅ Antes vs Ahora:**

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Persistencia** | ❌ Se perdía al reiniciar | ✅ Persiste en MongoDB |
| **Búsqueda** | ❌ Solo por roomId+personId | ✅ Múltiples criterios |
| **Mensajes** | ❌ Máximo 10 | ✅ Máximo 20 |
| **Tracking** | ❌ Básico | ✅ Con messageId y timestamps |
| **Limpieza** | ❌ Manual | ✅ Automática |
| **Estadísticas** | ❌ No disponibles | ✅ Completas |

### **🎯 Resultado:**
- **Memoria persistente** entre reinicios del servidor
- **Búsqueda inteligente** por múltiples criterios
- **Mejor contexto** para el LLM
- **Estadísticas detalladas** para monitoreo
- **Limpieza automática** para optimizar rendimiento

## 🔄 **Migración**

### **Para conversaciones existentes:**
1. El sistema automáticamente migrará las conversaciones existentes
2. Se agregarán los nuevos campos automáticamente
3. No se perderán datos existentes

### **Para nuevos usuarios:**
1. Se creará automáticamente con la nueva estructura
2. Se obtendrá información del usuario (email, nombre)
3. Se aplicará la búsqueda inteligente desde el primer mensaje 