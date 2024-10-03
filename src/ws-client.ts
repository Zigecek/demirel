import { io } from 'socket.io-client';
import { API_URL } from './utils/apiUrl';
import { postSocketAuth } from './proxy/endpoints';


console.log('Connecting to websocket server: ' + API_URL);

export const socket = io(API_URL);

socket.on('connect', async () => {
  console.log('Connected to websocket server');

  // connect socket to user session on expresse
  await postSocketAuth({
    socketId: socket.id,
  });
});
