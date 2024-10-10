import "./axios";
import { get, postAsync, getAsync } from "./axios";

export const postSocketAuth = (data: SocketAuth) => postAsync<ApiBase<boolean>>("/api/sockets/auth", data);
export const getIfLoggedIn = get<ApiBase<boolean>>("/api/auth/loggedIn");
export const getIfLoggedInAsync = () => getAsync<ApiBase<boolean>>("/api/auth/loggedIn");
export const postLogin = (data: Login) => postAsync<ApiBase<UserSafe>>("/api/auth/login", data);
//export const getLogout = get<ApiBase<boolean>>("/api/auth/logout");
export const postRegister = (data: Register) => postAsync<ApiBase<UserSafe>>("/api/auth/register", data);
