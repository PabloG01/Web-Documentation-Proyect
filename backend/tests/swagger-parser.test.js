const { parseSwaggerComments } = require('../services/swagger-parser');

describe('Swagger Parser Service', () => {
    test('should correctly parse a simple @swagger comment', () => {
        const code = `
            /**
             * @swagger
             * /test:
             *   get:
             *     summary: Test endpoint
             *     responses:
             *       200:
             *         description: Success
             */
            function test() {}
        `;

        const result = parseSwaggerComments(code, 'test-file.js');

        expect(result.pathsCount).toBe(1);
        expect(result.spec.paths).toHaveProperty('/test');
        expect(result.spec.paths['/test'].get.summary).toBe('Test endpoint');
    });

    test('should parse components and schemas', () => {
        const code = `
            /**
             * @swagger
             * components:
             *   schemas:
             *     User:
             *       type: object
             *       properties:
             *         id: { type: integer }
             *         name: { type: string }
             */
        `;

        const result = parseSwaggerComments(code, 'test-file.js');

        expect(result.schemasCount).toBe(1);
        expect(result.spec.components.schemas).toHaveProperty('User');
        expect(result.spec.components.schemas.User.properties.name.type).toBe('string');
    });

    test('should throw error if no swagger comments are found', () => {
        const code = 'function noSwagger() {}';

        expect(() => {
            parseSwaggerComments(code, 'test-file.js');
        }).toThrow('No se encontraron comentarios Swagger válidos');
    });

    test('should handle multiple swagger blocks', () => {
        const code = `
            /**
             * @swagger
             * /users:
             *   get:
             *     summary: List users
             */
            
            /**
             * @swagger
             * /users:
             *   post:
             *     summary: Create user
             */
        `;

        const result = parseSwaggerComments(code, 'test-file.js');

        expect(result.pathsCount).toBe(1); // One path, two methods
        expect(result.spec.paths['/users']).toHaveProperty('get');
        expect(result.spec.paths['/users']).toHaveProperty('post');
    });
});
