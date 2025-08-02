// Configuración personalizable para Sábilo Bot
const BOT_CONFIG = {
  // Información de la organización
  organization: {
    name: "Arcor",
    description: "Organización que valora la excelencia en el servicio al cliente",
    website: "https://tuorganizacion.com",
    supportEmail: "soporte@tuorganizacion.com",
    supportPhone: "+1-800-SUPPORT"
  },

  // Productos y servicios específicos
  products: [
    {
      name: "Producto A",
      description: "Descripción del producto A",
      features: ["Característica 1", "Característica 2", "Característica 3"]
    },
    {
      name: "Servicio B", 
      description: "Descripción del servicio B",
      features: ["Beneficio 1", "Beneficio 2", "Beneficio 3"]
    }
  ],

  // Información técnica específica
  technicalInfo: {
    platforms: ["Web", "Mobile", "Desktop"],
    technologies: ["JavaScript", "Node.js", "MongoDB", "React"],
    integrations: ["Webex", "Slack", "Microsoft Teams"],
    deployment: "Render, AWS, Azure"
  },

  // Políticas y procedimientos
  policies: {
    escalation: "Para consultas complejas, contacta al equipo de soporte técnico",
    security: "Mantén la confidencialidad de la información",
    responseTime: "Respuesta en menos de 24 horas",
    availability: "Disponible 24/7 para consultas básicas"
  },

  // Personalidad del bot
  personality: {
    name: "Sábilo",
    tone: "amigable y profesional",
    expertise: "soporte técnico y atención al cliente",
    strengths: ["paciente", "útil", "profesional", "empático"]
  },

  // Configuración de respuestas
  responses: {
    maxLength: 500,
    useEmojis: true,
    suggestEscalation: true,
    includeContactInfo: true
  }
};

// Función para obtener contexto organizacional personalizado
function getOrganizationContext() {
  return `
CONTEXTO ORGANIZACIONAL ESPECÍFICO:
- Organización: ${BOT_CONFIG.organization.name}
- Descripción: ${BOT_CONFIG.organization.description}
- Sitio web: ${BOT_CONFIG.organization.website}
- Soporte: ${BOT_CONFIG.organization.supportEmail} | ${BOT_CONFIG.organization.supportPhone}

PRODUCTOS Y SERVICIOS:
${BOT_CONFIG.products.map(product => 
  `- ${product.name}: ${product.description}`
).join('\n')}

INFORMACIÓN TÉCNICA:
- Plataformas: ${BOT_CONFIG.technicalInfo.platforms.join(', ')}
- Tecnologías: ${BOT_CONFIG.technicalInfo.technologies.join(', ')}
- Integraciones: ${BOT_CONFIG.technicalInfo.integrations.join(', ')}

POLÍTICAS:
- Escalación: ${BOT_CONFIG.policies.escalation}
- Seguridad: ${BOT_CONFIG.policies.security}
- Tiempo de respuesta: ${BOT_CONFIG.policies.responseTime}
- Disponibilidad: ${BOT_CONFIG.policies.availability}
`;
}

// Función para obtener información de contacto
function getContactInfo() {
  return `
📧 Email: ${BOT_CONFIG.organization.supportEmail}
📞 Teléfono: ${BOT_CONFIG.organization.supportPhone}
🌐 Sitio web: ${BOT_CONFIG.organization.website}
`;
}

module.exports = {
  BOT_CONFIG,
  getOrganizationContext,
  getContactInfo
}; 