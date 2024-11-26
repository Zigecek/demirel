import { env } from "./envConfig";
import { Request, Response, NextFunction } from "express";

// Funkce pro validaci originu
export const validateOrigin = (origin: string | undefined): boolean => {
  if (env.NODE_ENV === "development") {
    // Povolit všechny localhost v development módu
    if (origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"))) {
      return true;
    }
  } else if (env.NODE_ENV === "production") {
    // Povolit specifické originy v produkčním prostředí
    if (origin && (origin.endsWith("kozohorsky.xyz") || origin === "https://kozohorsky.xyz" || origin.startsWith("http://192.168.") || origin.startsWith("http://10.66.66."))) {
      return true;
    }
  }

  // Pokud není origin povolen
  return false;
};

// Middleware pro vlastní CORS
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Validace originu
  if (origin && validateOrigin(origin)) {
    // Nastavit Access-Control-Allow-Origin na origin, ze kterého žádost přišla
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Pokud je origin nevalidní, lze vrátit defaultní hodnotu nebo chybu
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // Další CORS hlavičky podle potřeby
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true"); // Povolit cookies a autorizaci

  // Odpovědět na preflight OPTIONS žádosti
  if (req.method === "OPTIONS") {
    return res.sendStatus(StatusCodes.OK);
  }

  // Pokračovat v další logice
  next();
};
