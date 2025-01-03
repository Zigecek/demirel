import { user } from "@prisma/client";
import { UserState } from "../contexts/UserContext";
import "./axios";
import { get, getAsync, postAsync } from "./axios";

export const postSocketAuth = (data: SocketAuth) => postAsync<ApiBase<boolean>>("/api/sockets/auth", data);
export const getIfLoggedIn = get<ApiBase<Omit<user, "password">>>("/api/user/loggedIn");
export const getIfLoggedInAsync = () => getAsync<ApiBase<UserState>>("/api/user/loggedIn");
export const postLogin = (data: Login) => postAsync<ApiBase<UserState & { sessionId: string }>>("/api/user/login", data);
//export const getLogout = get<ApiBase<boolean>>("/api/user/logout");
export const postRegister = (data: Register) => postAsync<ApiBase<UserState>>("/api/user/register", data);
export const postMqttData = (requestData: postMqttDataRequest) => postAsync<ApiBase<MQTTMessageTransfer[]>>("/api/mqtt/data", requestData);
// web-push subscription endpoint for Web Push Notifications
export const postWebPushSubscribe = (data: PushSubscription) => postAsync<ApiBase<boolean>>("/api/push/subscribe", data);
export const postWebPushSendNotification = () => postAsync<ApiBase<boolean>>("/api/push/send-notification");

export const postMqttToday = (requestData: postMqttTodayRequest) => postAsync<ApiBase<postMqttTodayResponse>>("/api/mqtt/today", requestData);
export const postMqttStats = (requestData: postMqttStatsRequest) => postAsync<ApiBase<postMqttStatsResponse>>("/api/mqtt/stats", requestData);
export const postMqttNickname = (requestData: postMqttNicknameRequest) => postAsync<ApiBase<postMqttNicknameResponse>>("/api/mqtt/nickname", requestData);
export const getMqttFirstValues = () => getAsync<ApiBase<MQTTMessageTransfer[]>>("/api/mqtt/firstValues");

export const getNotificationRules = () => getAsync<ApiBase<Rule[]>>("/api/rule/getRules");
export const postNotificationRules = (requestData: SetRules) => postAsync<ApiBase<boolean>>("/api/rule/updateRules", requestData);

export const postDark = (requestData: postDarkRequest) => postAsync<ApiBase<boolean>>("/api/user/dark", requestData);
