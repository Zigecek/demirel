import axios, { AxiosRequestConfig } from "axios";
import { API_URL } from "../utils/apiUrl";

axios.defaults.withCredentials = true

console.log(API_URL);

export const getBase = async <T,>(url: string, config?: AxiosRequestConfig<any>, params?: any): Promise<T> => await (await axios.get(url, { ...config, withCredentials: true, params: params })).data;
export const postBase = async <T,>(url: string, data?: any, config?: AxiosRequestConfig<any>): Promise<T> => await (await axios.post(url, data, { ...config, withCredentials: true })).data;

export const get = <T,>(path: string, params?: any, url?: string, config?: AxiosRequestConfig<any>) => (dispatch: (data: T) => void) => {
  getBase<T>(`${url ?? API_URL}${path}`, config, params).then(
    (data) => { dispatch(data); },
    (err) => { console.log(err); });
};

export const post = <T,> (path: string, data ?: any, url ?: string, config ?: AxiosRequestConfig) => (dispatch: (data: T, err?: any) => void) => {
  postBase<T>(`${url ?? API_URL}${path}`, data, config).then(
    (data) => { dispatch(data as T); },
    (err) => { console.log(err); dispatch(undefined as T, err); });
};

export const postAsync = <T,>(path: string, data?: any, url?: string) => postBase<T>(`${url ?? API_URL}${path}`, data);
export const getAsync = <T,>(path: string, url?: string) => getBase<T>(`${url ?? API_URL}${path}`);