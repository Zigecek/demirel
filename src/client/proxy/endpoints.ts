import "./axios";
import { get, postAsync, getAsync } from "./axios";
import { user } from "@prisma/client";

export const postSocketAuth = (data: SocketAuth) => postAsync<ApiBase<boolean>>("/api/sockets/auth", data);
export const getIfLoggedIn = get<ApiBase<Omit<user, "password">>>("/api/auth/loggedIn");
export const getIfLoggedInAsync = () => getAsync<ApiBase<Omit<user, "password">>>("/api/auth/loggedIn");
export const postLogin = (data: Login) => postAsync<ApiBase<UserSafe>>("/api/auth/login", data);
//export const getLogout = get<ApiBase<boolean>>("/api/auth/logout");
export const postRegister = (data: Register) => postAsync<ApiBase<UserSafe>>("/api/auth/register", data);
export const postMqttData = (requestData: postMqttDataRequest) => postAsync<ApiBase<MQTTMessageTransfer[]>>("/api/mqtt/data", requestData);
// web-push subscription endpoint for Web Push Notifications
export const postWebPushSubscribe = (data: PushSubscription) => postAsync<ApiBase<boolean>>("/api/push/subscribe", data);
export const postWebPushSendNotification = () => postAsync<ApiBase<boolean>>("/api/push/send-notification");

export const postMqttToday = (requestData: postMqttTodayRequest) => postAsync<ApiBase<postMqttTodayResponse>>("/api/mqtt/today", requestData);

export const postMqttStats = (requestData: postMqttStatsRequest) => postAsync<ApiBase<postMqttStatsResponse>>("/api/mqtt/stats", requestData);