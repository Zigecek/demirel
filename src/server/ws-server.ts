import { Server } from 'socket.io';
import { logger } from './server.js';

export default (io: Server) => {
  logger.info('Websocket server started');

  io.on('connection', (socket) => {
    console.log(`${socket.id}: Connected`);
    socket.on('disconnect', () => {
      console.log(`${socket.id}: Disconnected`);
    });
  });
}