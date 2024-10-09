import { getIfLoggedInAsync } from "../proxy/endpoints";
import { socket } from "../ws-client";

export const root = async () => {
  socket.connect();
  return null;
};

export const loginRegister = async () => {
  const data = await getIfLoggedInAsync();
  if (data.responseObject) {
    window.location.href = "/";
    return null;
  }
  return null;
};
