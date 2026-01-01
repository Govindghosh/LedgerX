
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
    auth: { token: 'invalid-token' },
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('Connected!');
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error('Connect error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('Timeout');
    process.exit(1);
}, 5000);
