import { io } from 'socket.io-client';
import { API_URL } from './utils/apiUrl';

console.log('Connecting to websocket server: ' + API_URL);

export const socket = io(API_URL);
