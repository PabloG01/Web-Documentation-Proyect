import React, { useState } from 'react';
import TableOfContents from './TableOfContents';
import MarkdownEditor from './MarkdownEditor';
import '../styles/DocumentForm.css';

function DocumentForm({ documentType, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: '',
    version: '1.0.0',
    content: ''
  });

  const getPlaceholders = (type) => {
    const placeholders = {
      api: {
        title: 'API REST de Usuarios',
        description: 'Define los endpoints disponibles',
        content: `# Endpoints disponibles:
## GET /users
- Descripción: Obtiene lista de usuarios
- Parámetros: page, limit
- Respuesta: [...]

## POST /users
- Descripción: Crea un nuevo usuario
- Body: { name, email, password }
- Respuesta: { id, name, email }`
      },
      usuario: {
        title: 'Guía de Usuario - Sistema X',
        description: 'Instrucciones para usuarios finales',
        content: `# Guía de Usuario

## Introducción
Bienvenido a nuestro sistema.

## Primeros Pasos
1. Acceda a la plataforma
2. Inicie sesión
3. Complete su perfil

## Funcionalidades Principales
...`
      },
      tecnica: {
        title: 'Documentación Técnica del Proyecto',
        description: 'Especificaciones técnicas y arquitectura',
        content: `# Arquitectura del Sistema

## Stack Tecnológico
- Frontend: React
- Backend: Node.js
- Base de Datos: MongoDB

## Componentes Principales
...

## Diagrama de Flujo
...`
      },
      procesos: {
        title: 'Proceso de Aprobación',
        description: 'Flujo de procesos de negocio',
        content: `# Proceso de Aprobación

## Pasos del Proceso
1. Solicitud inicial
2. Revisión
3. Aprobación
4. Ejecución

## Actores Involucrados
- Solicitante
- Revisor
- Aprobador`
      },
      proyecto: {
        title: 'Proyecto X - 2025',
        description: 'Resumen y objetivos del proyecto',
        content: `# Resumen Ejecutivo

## Objetivos
- Objetivo 1
- Objetivo 2
- Objetivo 3

## Alcance
...

## Entregables
...

## Timeline
...`
      },
      requisitos: {
        title: 'Especificación de Requisitos',
        description: 'Requisitos funcionales y técnicos',
        content: `# Requisitos del Sistema

## Requisitos Funcionales
- RF1: Descripción del requisito 1
- RF2: Descripción del requisito 2

## Requisitos Técnicos
- RT1: Descripción técnica
- RT2: Descripción técnica

## Restricciones
...`
      }
    };
    return placeholders[type] || {};
  };

  const placeholders = getPlaceholders(documentType.id);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      type: documentType.id,
      typeName: documentType.name,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>{documentType.icon} {documentType.name}</h2>
        <p>{documentType.description}</p>
      </div>

      <div className="form-with-toc">
      <form onSubmit={handleSubmit} className="document-form">
        <div className="form-group">
          <label htmlFor="title">Título del Documento</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder={placeholders.title}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="author">Autor</label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="version">Versión</label>
            <input
              type="text"
              id="version"
              name="version"
              value={formData.version}
              onChange={handleChange}
              placeholder="1.0.0"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Descripción Breve</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={placeholders.description}
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Contenido</label>
          <MarkdownEditor
            value={formData.content}
            onChange={(newContent) => setFormData(prev => ({ ...prev, content: newContent }))}
            placeholder={placeholders.content}
            showPreview={true}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Crear Documento
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
            Cancelar
          </button>
        </div>
      </form>
      <TableOfContents content={formData.content} />
      </div>
    </div>
  );
}

export default DocumentForm;
