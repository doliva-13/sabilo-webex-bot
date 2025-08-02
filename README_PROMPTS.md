# 🎯 Personalización de Prompts - Sábilo Bot

## 📁 Archivos de Configuración

### `config.js` - Configuración Principal
Aquí puedes personalizar toda la información de tu organización:

```javascript
const BOT_CONFIG = {
  organization: {
    name: "Tu Organización",
    description: "Descripción de tu organización",
    website: "https://tuorganizacion.com",
    supportEmail: "soporte@tuorganizacion.com",
    supportPhone: "+1-800-SUPPORT"
  },
  // ... más configuración
};
```

### `prompts.js` - Prompts del LLM
Aquí puedes modificar los prompts base que se envían al LLM.

## 🔧 Cómo Personalizar

### 1. Información de la Organización
Edita `config.js` y actualiza:

```javascript
organization: {
  name: "Empresa XYZ",
  description: "Empresa líder en soluciones tecnológicas",
  website: "https://empresaxyz.com",
  supportEmail: "soporte@empresaxyz.com",
  supportPhone: "+57-1-123-4567"
}
```

### 2. Productos y Servicios
Agrega tus productos específicos:

```javascript
products: [
  {
    name: "Sistema de Gestión",
    description: "Plataforma integral para gestión empresarial",
    features: ["CRM", "Facturación", "Inventario"]
  },
  {
    name: "App Móvil",
    description: "Aplicación móvil para clientes",
    features: ["Acceso 24/7", "Notificaciones", "Pagos"]
  }
]
```

### 3. Información Técnica
Especifica tus tecnologías:

```javascript
technicalInfo: {
  platforms: ["Web", "iOS", "Android"],
  technologies: ["React", "Node.js", "MongoDB", "AWS"],
  integrations: ["Webex", "Slack", "Zapier"],
  deployment: "AWS, Google Cloud"
}
```

### 4. Políticas y Procedimientos
Define tus políticas:

```javascript
policies: {
  escalation: "Para consultas complejas, contacta al equipo técnico",
  security: "Mantén la confidencialidad de la información",
  responseTime: "Respuesta en menos de 2 horas",
  availability: "Disponible 24/7"
}
```

## 🎨 Personalización de Prompts

### Tipos de Prompts Disponibles

1. **mainPrompt** - Prompt principal para conversaciones generales
2. **greetingPrompt** - Para saludos y presentaciones
3. **technicalPrompt** - Para consultas técnicas
4. **generalPrompt** - Para consultas generales

### Detección Automática de Tipo

El bot detecta automáticamente el tipo de mensaje:

- **Saludos**: "hola", "buenos días", "hi", "hello"
- **Técnico**: "error", "problema", "configuración", "sistema", etc.
- **General**: Cualquier otro mensaje

### Estructura del Prompt

Cada prompt incluye:
1. **Contexto organizacional** (desde `config.js`)
2. **Capacidades y directrices**
3. **Conversación anterior** (si existe)
4. **Mensaje actual del usuario**
5. **Instrucciones finales**
6. **Información de contacto**

## 🚀 Ejemplo de Personalización Completa

```javascript
// config.js
const BOT_CONFIG = {
  organization: {
    name: "TechCorp Solutions",
    description: "Empresa especializada en desarrollo de software y consultoría tecnológica",
    website: "https://techcorp.com",
    supportEmail: "soporte@techcorp.com",
    supportPhone: "+1-555-TECH"
  },
  
  products: [
    {
      name: "TechCorp CRM",
      description: "Sistema de gestión de relaciones con clientes",
      features: ["Gestión de leads", "Automatización", "Analytics"]
    },
    {
      name: "TechCorp Analytics",
      description: "Plataforma de análisis de datos en tiempo real",
      features: ["Dashboards", "Reportes", "Machine Learning"]
    }
  ],
  
  technicalInfo: {
    platforms: ["Web", "Mobile", "Desktop", "Cloud"],
    technologies: ["React", "Node.js", "Python", "AWS", "Docker"],
    integrations: ["Salesforce", "HubSpot", "Zapier", "Webex"],
    deployment: "AWS, Azure, Google Cloud"
  },
  
  policies: {
    escalation: "Para consultas complejas, contacta a nuestro equipo técnico especializado",
    security: "Mantenemos los más altos estándares de seguridad y confidencialidad",
    responseTime: "Respuesta garantizada en menos de 1 hora",
    availability: "Soporte técnico disponible 24/7"
  }
};
```

## 📝 Logs y Debugging

El bot registra información detallada:

```
🔍 Tipo de mensaje detectado: technical
📝 Prompt construido: Eres Sábilo, especialista en soporte técnico...
🤖 Respuesta de Gemini: [respuesta del LLM]
```

## 🔄 Reinicio Requerido

Después de modificar `config.js` o `prompts.js`:
1. Guarda los cambios
2. Reinicia el bot en Render
3. Los cambios se aplicarán automáticamente

## 💡 Consejos

1. **Mantén la información actualizada** en `config.js`
2. **Prueba diferentes prompts** para optimizar las respuestas
3. **Revisa los logs** para ver cómo se construyen los prompts
4. **Personaliza según tu industria** y necesidades específicas
5. **Mantén un tono consistente** en toda la configuración

## 🎯 Resultado

Con esta configuración, tu bot tendrá:
- ✅ Contexto específico de tu organización
- ✅ Información de productos y servicios
- ✅ Políticas y procedimientos claros
- ✅ Detección automática de tipos de consulta
- ✅ Respuestas más relevantes y personalizadas
- ✅ Información de contacto integrada 