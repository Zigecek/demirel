import "./axios";
import { get, postAsync } from "./axios";

export const getRoot = get<ApiBase<string>>("/");
export const postSocketAuth = (data: SocketAuth) => postAsync<ApiBase<boolean>>("/sockets/auth", data);