/**
 * Sanitization utilities for query parameters and user input
 * Helps prevent SQL injection and ensure data integrity
 */

/**
 * Sanitize pagination parameters
 * @param {Object} params - Query parameters
 * @param {string|number} params.page - Page number
 * @param {string|number} params.limit - Items per page
 * @param {number} maxLimit - Maximum allowed limit (default: 100)
 * @returns {Object} Sanitized { page, limit }
 */
const sanitizePagination = ({ page, limit }, maxLimit = 100) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 10));

    return {
        page: pageNum,
        limit: limitNum
    };
};

/**
 * Sanitize and validate integer input
 * @param {any} value - Value to sanitize
 * @param {number|null} defaultValue - Default if invalid (default: null)
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @returns {number|null} Sanitized integer or default
 */
const sanitizeInteger = (value, defaultValue = null, options = {}) => {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    const num = parseInt(value, 10);

    if (isNaN(num)) {
        return defaultValue;
    }

    // Apply min/max constraints if provided
    if (options.min !== undefined && num < options.min) {
        return defaultValue;
    }
    if (options.max !== undefined && num > options.max) {
        return defaultValue;
    }

    return num;
};

/**
 * Validate if value is a valid positive integer
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid positive integer
 */
const isValidInteger = (value) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
};

/**
 * Validate if value is a safe integer ID (for database operations)
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid and safe for DB
 */
const isValidId = (value) => {
    if (value === undefined || value === null || value === '') {
        return false;
    }

    const num = Number(value);
    return Number.isInteger(num) && num > 0 && num <= Number.MAX_SAFE_INTEGER;
};

/**
 * Sanitize boolean query parameter
 * @param {any} value - Value to sanitize
 * @param {boolean} defaultValue - Default if invalid
 * @returns {boolean} Sanitized boolean
 */
const sanitizeBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    const str = String(value).toLowerCase();
    return str === 'true' || str === '1';
};

module.exports = {
    sanitizePagination,
    sanitizeInteger,
    isValidInteger,
    isValidId,
    sanitizeBoolean
};
