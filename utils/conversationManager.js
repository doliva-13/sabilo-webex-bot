const Conversation = require('../models/Conversation');

class ConversationManager {
  
  // Buscar conversación existente por múltiples criterios
  static async findConversation(roomId, personId, personEmail = null) {
    try {
      // 1. Buscar por roomId y personId (método actual)
      let conversation = await Conversation.findOne({ 
        roomId, 
        personId,
        isActive: true 
      }).sort({ lastUpdated: -1 });
      
      if (conversation) {
        console.log(`✅ Conversación encontrada por roomId/personId: ${conversation._id}`);
        return conversation;
      }
      
      // 2. Si no se encuentra, buscar por email del usuario
      if (personEmail) {
        conversation = await Conversation.findOne({ 
          personEmail,
          isActive: true 
        }).sort({ lastUpdated: -1 });
        
        if (conversation) {
          console.log(`✅ Conversación encontrada por email: ${conversation._id}`);
          // Actualizar roomId y personId para futuras búsquedas
          conversation.roomId = roomId;
          conversation.personId = personId;
          await conversation.save();
          return conversation;
        }
      }
      
      // 3. Buscar conversaciones recientes del mismo usuario (últimas 24 horas)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      conversation = await Conversation.findOne({
        personId,
        lastUpdated: { $gte: yesterday },
        isActive: true
      }).sort({ lastUpdated: -1 });
      
      if (conversation) {
        console.log(`✅ Conversación reciente encontrada: ${conversation._id}`);
        // Actualizar roomId para futuras búsquedas
        conversation.roomId = roomId;
        await conversation.save();
        return conversation;
      }
      
      console.log(`❌ No se encontró conversación existente para roomId: ${roomId}, personId: ${personId}`);
      return null;
      
    } catch (error) {
      console.error('❌ Error buscando conversación:', error);
      return null;
    }
  }
  
  // Crear nueva conversación
  static async createConversation(roomId, personId, personEmail = null, personDisplayName = null) {
    try {
      const conversation = new Conversation({
        roomId,
        personId,
        personEmail,
        personDisplayName,
        messages: [],
        maxMessages: 20
      });
      
      await conversation.save();
      console.log(`✅ Nueva conversación creada: ${conversation._id}`);
      return conversation;
    } catch (error) {
      console.error('❌ Error creando conversación:', error);
      return null;
    }
  }
  
  // Obtener o crear conversación
  static async getOrCreateConversation(roomId, personId, personEmail = null, personDisplayName = null) {
    let conversation = await this.findConversation(roomId, personId, personEmail);
    
    if (!conversation) {
      conversation = await this.createConversation(roomId, personId, personEmail, personDisplayName);
    }
    
    return conversation;
  }
  
  // Obtener historial de conversación con contexto mejorado
  static async getConversationHistory(roomId, personId, personEmail = null) {
    try {
      const conversation = await this.getOrCreateConversation(roomId, personId, personEmail);
      
      if (!conversation || conversation.messages.length === 0) {
        return '';
      }
      
      // Crear contexto más rico
      const context = {
        conversationId: conversation._id,
        totalMessages: conversation.messageCount,
        lastUpdated: conversation.lastUpdated,
        duration: conversation.lastUpdated - conversation.createdAt,
        messages: conversation.getFormattedHistory()
      };
      
      console.log(`📚 Historial recuperado: ${conversation.messages.length} mensajes`);
      return context.messages;
      
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return '';
    }
  }
  
  // Guardar mensaje con mejor tracking
  static async saveMessage(roomId, personId, role, content, messageId = null, personEmail = null) {
    try {
      const conversation = await this.getOrCreateConversation(roomId, personId, personEmail);
      
      if (!conversation) {
        console.error('❌ No se pudo obtener o crear conversación');
        return false;
      }
      
      await conversation.addMessage(role, content, messageId);
      console.log(`💾 Mensaje guardado: ${role} - ${content.substring(0, 50)}...`);
      return true;
      
    } catch (error) {
      console.error('❌ Error guardando mensaje:', error);
      return false;
    }
  }
  
  // Obtener estadísticas de conversación
  static async getConversationStats(roomId, personId) {
    try {
      const conversation = await Conversation.findOne({ roomId, personId });
      
      if (!conversation) {
        return null;
      }
      
      return conversation.getConversationSummary();
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }
  
  // Limpiar conversaciones antiguas
  static async cleanupOldConversations(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await Conversation.updateMany(
        { lastUpdated: { $lt: cutoffDate } },
        { isActive: false }
      );
      
      console.log(`🧹 Limpiadas ${result.modifiedCount} conversaciones antiguas`);
      return result.modifiedCount;
      
    } catch (error) {
      console.error('❌ Error limpiando conversaciones:', error);
      return 0;
    }
  }
  
  // Buscar conversaciones por usuario
  static async findUserConversations(personId, personEmail = null, limit = 5) {
    try {
      const query = personEmail ? 
        { $or: [{ personId }, { personEmail }] } : 
        { personId };
      
      const conversations = await Conversation.find({
        ...query,
        isActive: true
      })
      .sort({ lastUpdated: -1 })
      .limit(limit);
      
      return conversations;
      
    } catch (error) {
      console.error('❌ Error buscando conversaciones del usuario:', error);
      return [];
    }
  }
}

module.exports = ConversationManager; 