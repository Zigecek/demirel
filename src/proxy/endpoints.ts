import "./axios";
import { get } from "./axios";


type ApiBase<T> = {
  success: boolean;
  message: string;
  status: number;
  responseObject: T;
};


export const getRoot = get<ApiBase<string>>("/");