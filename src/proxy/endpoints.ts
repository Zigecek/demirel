import "./axios";
import { get, postAsync } from "./axios";

export const getRoot = get<ApiBase<string>>("/");
export const postSocketAuth = (data: SocketAuth) => postAsync<ApiBase<boolean>>("/sockets/auth", data);
export const getIfLoggedIn = get<ApiBase<boolean>>("/auth/loggedIn");
// login: /auth/login
export const postLogin = (data: Login) => postAsync<ApiBase<UserSafe>>("/auth/login", data);
// logout: /auth/logout
export const getLogout = get<ApiBase<boolean>>("/auth/logout");
// register: /auth/register
export const postRegister = (data: Register) => postAsync<ApiBase<UserSafe>>("/auth/register", data);
