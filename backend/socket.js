const socketIo = require('socket.io');

let io;

module.exports = {
    init: (httpServer) => {
        io = socketIo(httpServer, {
            cors: {
                origin: "*", // Allow all origins for simplicity in this project
                methods: ["GET", "POST"]
            }
        });

        console.log('🔌 Socket.IO initialized');

        io.on('connection', (socket) => {
            console.log('👤 Client connected to socket:', socket.id);

            socket.on('disconnect', () => {
                console.log('👋 Client disconnected:', socket.id);
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error('Socket.IO not initialized!');
        }
        return io;
    }
};
