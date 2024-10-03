type ApiBase<T> = {
  success: boolean;
  message: string;
  status: number;
  responseObject: T;
};

type SocketAuth = {
  socketId: string | undefined;
};
