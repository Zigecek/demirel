import "./axios";
import { get, postAsync } from "./axios";

export const getRoot = get<ApiBase<string>>("/");
export const postSocketAuth = (data: SocketAuth) => postAsync<ApiBase<boolean>>("/sockets/auth", data);
export const getIfLoggedIn = get<ApiBase<boolean>>("/auth/loggedIn");
// login: /auth/login
// logout: /auth/logout
// register: /auth/register