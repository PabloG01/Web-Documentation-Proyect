# Guía de Implementación de OpenAPI

Esta guía explica cómo generar especificaciones OpenAPI para diferentes tipos de proyectos y frameworks.

## ¿Qué es OpenAPI?

OpenAPI (anteriormente Swagger) es una especificación estándar para describir APIs RESTful. Permite:
- 📝 Documentación automática e interactiva
- 🔄 Generación de código cliente/servidor
- ✅ Validación de peticiones/respuestas
- 🧪 Testing de APIs

## Tabla de Contenidos

1. [Especificación Manual](#1-especificación-manual)
2. [Node.js / Express](#2-nodejs--express)
3. [Python / FastAPI](#3-python--fastapi)
4. [Spring Boot (Java)](#4-spring-boot-java)
5. [ASP.NET Core (C#)](#5-aspnet-core-c)
6. [Herramientas Útiles](#herramientas-útiles)

---

## 1. Especificación Manual

### Estructura Básica

Crea un archivo `openapi.json` o `openapi.yaml`:

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Mi API",
    "version": "1.0.0",
    "description": "Descripción de la API"
  },
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Servidor local"
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "Obtener usuarios",
        "responses": {
          "200": {
            "description": "Lista de usuarios",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/User"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "email": { "type": "string", "format": "email" }
        }
      }
    }
  }
}
```

### Ventajas
✅ Control total sobre la especificación
✅ No requiere dependencias

### Desventajas
❌ Mantenimiento manual
❌ Propenso a errores de sincronización

---

## 2. Node.js / Express

### Opción A: swagger-jsdoc (JSDoc)

**Instalación:**
```bash
npm install swagger-jsdoc swagger-ui-express
```

**Implementación:**

```javascript
// server.js
const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mi API',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./routes/*.js'], // Archivos con anotaciones
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Servir documentación
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoint para descargar JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
```

**Anotar rutas:**

```javascript
// routes/users.js

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/users', async (req, res) => {
  // Lógica del endpoint
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 */
```

### Opción B: express-openapi

**Instalación:**
```bash
npm install express-openapi
```

Documentación: https://github.com/kogosoftwarellc/open-api/tree/master/packages/express-openapi

---

## 3. Python / FastAPI

FastAPI genera automáticamente la especificación OpenAPI.

**Instalación:**
```bash
pip install fastapi uvicorn
```

**Implementación:**

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="Mi API",
    description="Descripción de la API",
    version="1.0.0"
)

class User(BaseModel):
    id: int
    name: str
    email: str

@app.get("/users", response_model=list[User], tags=["Users"])
async def get_users():
    """Obtener todos los usuarios"""
    return [
        {"id": 1, "name": "Juan", "email": "juan@example.com"}
    ]

@app.post("/users", response_model=User, tags=["Users"])
async def create_user(user: User):
    """Crear un nuevo usuario"""
    return user
```

**Ejecutar:**
```bash
uvicorn main:app --reload
```

**Acceder a la especificación:**
- Documentación interactiva: http://localhost:8000/docs
- JSON: http://localhost:8000/openapi.json
- ReDoc: http://localhost:8000/redoc

**Descargar JSON:**
```bash
curl http://localhost:8000/openapi.json > openapi.json
```

---

## 4. Spring Boot (Java)

### Usar Springdoc OpenAPI

**Añadir dependencia (Maven):**

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

**Configuración:**

```java
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Mi API")
                .version("1.0.0")
                .description("Descripción de la API"));
    }
}
```

**Anotar controladores:**

```java
@RestController
@RequestMapping("/users")
@Tag(name = "Users", description = "API de usuarios")
public class UserController {

    @GetMapping
    @Operation(summary = "Obtener usuarios", description = "Retorna lista de usuarios")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Lista obtenida",
            content = @Content(schema = @Schema(implementation = User.class)))
    })
    public List<User> getUsers() {
        return userService.findAll();
    }
}
```

**Acceder:**
- Swagger UI: http://localhost:8080/swagger-ui.html
- JSON: http://localhost:8080/v3/api-docs

---

## 5. ASP.NET Core (C#)

### Usar Swashbuckle

**Instalar NuGet:**
```bash
dotnet add package Swashbuckle.AspNetCore
```

**Configurar en Program.cs:**

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Mi API",
        Version = "v1",
        Description = "Descripción de la API"
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Mi API v1");
});

app.MapControllers();
app.Run();
```

**Anotar controladores:**

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    /// <summary>
    /// Obtener todos los usuarios
    /// </summary>
    /// <returns>Lista de usuarios</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<User>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<User>> GetUsers()
    {
        return Ok(users);
    }
}
```

**Acceder:**
- Swagger UI: https://localhost:5001/swagger
- JSON: https://localhost:5001/swagger/v1/swagger.json

---

## Herramientas Útiles

### Editores Online
- **Swagger Editor**: https://editor.swagger.io
  - Editar y validar especificaciones
  - Generar código cliente/servidor

- **Stoplight Studio**: https://stoplight.io/studio
  - Editor visual de OpenAPI
  - Validación en tiempo real

### Generadores de Código
- **OpenAPI Generator**: https://openapi-generator.tech
  ```bash
  npm install @openapitools/openapi-generator-cli -g
  openapi-generator-cli generate -i openapi.json -g javascript -o ./client
  ```

### Validadores
- **Swagger Parser**: Validar especificaciones
  ```bash
  npm install -g @apidevtools/swagger-parser
  swagger-parser validate openapi.json
  ```

- **Spectral**: Linter para OpenAPI
  ```bash
  npm install -g @stoplight/spectral-cli
  spectral lint openapi.json
  ```

### Convertidores
- **swagger2openapi**: Convertir Swagger 2.0 a OpenAPI 3.0
  ```bash
  npm install -g swagger2openapi
  swagger2openapi swagger.json > openapi.json
  ```

---

## Mejores Prácticas

### 1. Versionado
```json
{
  "info": {
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.example.com/v1"
    }
  ]
}
```

### 2. Usar Referencias ($ref)
```json
{
  "components": {
    "schemas": {
      "User": { "..." }
    }
  },
  "paths": {
    "/users": {
      "get": {
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 3. Documentar Autenticación
```json
{
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    }
  ]
}
```

### 4. Ejemplos Completos
```json
{
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "example": 1 },
          "name": { "type": "string", "example": "Juan Pérez" }
        }
      }
    }
  }
}
```

### 5. Códigos de Estado HTTP
```json
{
  "responses": {
    "200": { "description": "Éxito" },
    "201": { "description": "Creado" },
    "400": { "description": "Petición inválida" },
    "401": { "description": "No autenticado" },
    "403": { "description": "No autorizado" },
    "404": { "description": "No encontrado" },
    "500": { "description": "Error del servidor" }
  }
}
```

---

## Flujo de Trabajo Recomendado

### Para Nuevos Proyectos
1. **Diseño API-First**: Escribir especificación OpenAPI primero
2. **Validar**: Usar editores online o herramientas CLI
3. **Generar código**: Cliente y servidor desde la especificación
4. **Implementar**: Desarrollar basándose en el contrato

### Para Proyectos Existentes
1. **Anotar rutas**: Añadir comentarios JSDoc, decoradores, etc.
2. **Generar especificación**: Usar herramientas automáticas
3. **Validar**: Comprobar que la especificación sea correcta
4. **Publicar**: Hacer disponible el archivo JSON

---

## Recursos Adicionales

- **Especificación OpenAPI 3.0**: https://swagger.io/specification/
- **Swagger Docs**: https://swagger.io/docs/
- **OpenAPI Initiative**: https://www.openapis.org/
- **Awesome OpenAPI**: https://github.com/APIs-guru/awesome-openapi3

---

## Ejemplo: Exportar desde este Proyecto

Este proyecto ya incluye un archivo `openapi.json` generado manualmente. Para actualizarlo:

1. **Editar** `backend/openapi.json`
2. **Validar** con Swagger Editor online
3. **Probar** en la sección "API Testing" del frontend
4. **Mantener sincronizado** con los cambios en el código

Para automatizar en el futuro, considera implementar `swagger-jsdoc` siguiendo la Opción A de Node.js.
