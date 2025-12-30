# Guía de Paginación

## 📊 Implementación de Paginación

Se ha implementado paginación en los endpoints de documentos y proyectos para mejorar el rendimiento y evitar la sobrecarga del servidor con grandes volúmenes de datos.

## 🔧 Endpoints Actualizados

### GET /documents
```
GET /documents?page=1&limit=10&project_id=123
```

### GET /projects
```
GET /projects?page=1&limit=10&user_only=true
```

## 📝 Parámetros de Query

| Parámetro | Tipo | Por Defecto | Máximo | Descripción |
|-----------|------|-------------|---------|-------------|
| `page` | number | 1 | - | Número de página (empezando desde 1) |
| `limit` | number | 10 | 100 | Cantidad de items por página |

## 📤 Formato de Respuesta

```json
{
  "data": [
    {
      "id": 1,
      "title": "Mi Documento",
      ...
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 95,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## 🎯 Características

### Backend
- ✅ Usa `LIMIT` y `OFFSET` en SQL para consultas eficientes
- ✅ Límite máximo de 100 items por página para prevenir abusos
- ✅ Cálculo de totales mediante `COUNT(*)` en paralelo con la consulta de datos
- ✅ Validación y sanitización de parámetros de paginación
- ✅ Compatible con filtros existentes (project_id, user_only)

### Frontend
- ✅ Manejo automático del nuevo formato de respuesta
- ✅ Retrocompatibilidad: funciona con respuestas paginadas y no paginadas
- ✅ Por defecto solicita 100 items para mantener la experiencia actual
- ✅ Preparado para implementar UI de paginación en el futuro

## 🚀 Beneficios

1. **Rendimiento**: Reduce significativamente la carga en el servidor y base de datos
2. **Escalabilidad**: Permite manejar miles de registros sin problemas
3. **Memoria**: Reduce el uso de memoria en cliente y servidor
4. **Velocidad**: Respuestas más rápidas al transferir menos datos

## 💡 Uso en Frontend

### Ejemplo básico
```javascript
// Obtener la primera página con 20 documentos
const response = await documentsAPI.getAll(1, 20);
const documents = response.data.data;
const pagination = response.data.pagination;

console.log(`Mostrando ${documents.length} de ${pagination.totalItems} documentos`);
```

### Navegación entre páginas
```javascript
const [currentPage, setCurrentPage] = useState(1);
const [documents, setDocuments] = useState([]);
const [pagination, setPagination] = useState(null);

const loadDocuments = async (page) => {
  const response = await documentsAPI.getAll(page, 20);
  setDocuments(response.data.data);
  setPagination(response.data.pagination);
  setCurrentPage(page);
};

// Siguiente página
if (pagination?.hasNextPage) {
  loadDocuments(currentPage + 1);
}

// Página anterior
if (pagination?.hasPrevPage) {
  loadDocuments(currentPage - 1);
}
```

## 🔮 Próximas Mejoras

- [ ] Agregar componente UI de paginación en DocumentsListPage
- [ ] Agregar componente UI de paginación en ProjectsPage
- [ ] Implementar búsqueda y filtros con paginación
- [ ] Agregar configuración de items por página
- [ ] Implementar scroll infinito como alternativa
- [ ] Cachear páginas visitadas para mejor UX

## 🧪 Testing

### Probar paginación manualmente:
```bash
# Primera página (10 items)
curl http://localhost:5000/documents?page=1&limit=10

# Segunda página (10 items)
curl http://localhost:5000/documents?page=2&limit=10

# Obtener 50 items
curl http://localhost:5000/documents?page=1&limit=50

# Límite máximo (100 items)
curl http://localhost:5000/documents?page=1&limit=100

# Intentar más de 100 (se limitará a 100)
curl http://localhost:5000/documents?page=1&limit=500
```

### Con filtros:
```bash
# Paginación + filtro de proyecto
curl http://localhost:5000/documents?project_id=1&page=1&limit=20

# Proyectos del usuario con paginación
curl http://localhost:5000/projects?user_only=true&page=1&limit=10
```

## 📚 Documentación Técnica

### Implementación SQL
```sql
-- Consulta con paginación
SELECT * FROM documents
ORDER BY created_at DESC
LIMIT 10 OFFSET 20;  -- Página 3 (20 items omitidos)

-- Conteo total en paralelo
SELECT COUNT(*) FROM documents;
```

### Cálculo de OFFSET
```javascript
const offset = (page - 1) * limit;
// Página 1: (1 - 1) * 10 = 0
// Página 2: (2 - 1) * 10 = 10
// Página 3: (3 - 1) * 10 = 20
```

### Validación de parámetros
```javascript
const pageNum = Math.max(1, parseInt(page) || 1);  // Mínimo: 1
const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));  // Rango: 1-100
```
