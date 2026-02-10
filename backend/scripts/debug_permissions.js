
// Set environment variables BEFORE requiring database
process.env.DB_USER = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_DATABASE = 'docapp_db';
process.env.DB_PASSWORD = 'usu2020';
process.env.DB_PORT = '5432';

const { pool } = require('../database');
const documentsRepo = require('../repositories/documents.repository');

async function run() {
    try {
        console.log('--- Starting Permission Verification ---');

        // 1. Create a Project Owner (User A)
        const userA = await pool.query(`INSERT INTO users (username, email, password_hash) VALUES ('UserA_' || NOW(), 'usera_' || NOW() || '@test.com', 'hash') RETURNING id`);
        const userAId = userA.rows[0].id;
        console.log(`Created Project Owner (User A): ID ${userAId}`);

        // 2. Create a Project owned by User A
        const project = await pool.query(`INSERT INTO projects (user_id, code, name) VALUES ($1, 'PROJ_A', 'Project A') RETURNING id`, [userAId]);
        const projectId = project.rows[0].id; // User A's project

        // 3. Create a New User (User B)
        const userB = await pool.query(`INSERT INTO users (username, email, password_hash) VALUES ('UserB_' || NOW(), 'userb_' || NOW() || '@test.com', 'hash') RETURNING id`);
        const userBId = userB.rows[0].id;
        console.log(`Created New User (User B): ID ${userBId}`);

        // 4. Create a Document by User B in User A's Project
        const docB = await documentsRepo.createDocument({
            projectId,
            userId: userBId,
            title: 'Doc by B',
            content: 'Content'
        });
        console.log(`Created Document by User B in Project A: ID ${docB.id}`);

        // 5. Test: Can User B edit THEIR OWN document?
        const canEditOwn = await documentsRepo.checkOwnership(docB.id, userBId);
        console.log(`Can User B edit their OWN document? ${canEditOwn} (Expected: TRUE)`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
