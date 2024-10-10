import { getIfLoggedInAsync } from "../proxy/endpoints";

export const rootLoader = async () => {
  const data = await getIfLoggedInAsync();
  if (!data.responseObject) {
    window.location.href = "/login";
    return false;
  }
  return null;
};
