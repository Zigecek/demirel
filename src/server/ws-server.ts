import { Server } from 'socket.io';
import { logger } from './server.js';

export default (io: Server) => {
  logger.info('Websocket server started');
}