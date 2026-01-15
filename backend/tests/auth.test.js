const request = require('supertest');
const app = require('../server');
const { usersRepository } = require('../repositories');
const bcrypt = require('bcrypt');

// Set environment variables for tests
process.env.JWT_SECRET = 'testsecret';

// Mock user repository
jest.mock('../repositories', () => ({
    usersRepository: {
        findByEmail: jest.fn(),
        updateSessionToken: jest.fn(),
    }
}));

describe('Auth Routes - Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /auth/login', () => {
        test('should return 200 and set cookie on successful login', async () => {
            const mockUser = {
                id: 1,
                username: 'testu',
                email: 'test@example.com',
                password_hash: await bcrypt.hash('password123', 10)
            };

            usersRepository.findByEmail.mockResolvedValue(mockUser);
            usersRepository.updateSessionToken.mockResolvedValue(true);

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                username: 'testu',
                email: 'test@example.com'
            });
            expect(response.headers['set-cookie'][0]).toContain('auth_token=');
        });

        test('should return 400 for incorrect password', async () => {
            const mockUser = {
                id: 1,
                username: 'testu',
                email: 'test@example.com',
                password_hash: await bcrypt.hash('password123', 10)
            };

            usersRepository.findByEmail.mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email o contraseña incorrectos');
        });

        test('should return 400 if user not found', async () => {
            usersRepository.findByEmail.mockResolvedValue(null);

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'notfound@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email o contraseña incorrectos');
        });
    });
});
