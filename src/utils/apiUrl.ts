const getApiUrl = (): string => {
  const hostname = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT;
  console.log(`API port: ${port}`);

  if (hostname.startsWith("192.168.") || hostname.startsWith("10.66.66.") || hostname.startsWith("localhost")) {
    // Pokud běží na lokální síti
    return `http://${hostname}:${port}`; // Změň IP na adresu API serveru v lokální síti
  } else {
    // Výchozí hodnota, pokud žádný z případů nevyhovuje
    return `https://api.${hostname}`;
  }
};

export const API_URL = getApiUrl();
