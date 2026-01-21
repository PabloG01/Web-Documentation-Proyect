/**
 * Application Constants
 * Shared constants used across the application
 */

// Color palette for projects and environments
const COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#eab308', // Yellow
    '#84cc16', // Lime
    '#22c55e', // Green
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#0ea5e9', // Sky
    '#3b82f6', // Blue
    '#6366f1'  // Indigo (circular)
];

// Default colors
const DEFAULT_PROJECT_COLOR = '#6366f1';
const DEFAULT_ENVIRONMENT_COLOR = '#10b981';

// Pagination
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 10;

// Document types
const DOCUMENT_TYPES = ['api', 'usuario', 'tecnica', 'procesos', 'proyecto', 'requisitos'];

module.exports = {
    COLORS,
    DEFAULT_PROJECT_COLOR,
    DEFAULT_ENVIRONMENT_COLOR,
    MAX_PAGE_LIMIT,
    DEFAULT_PAGE_LIMIT,
    DOCUMENT_TYPES
};
