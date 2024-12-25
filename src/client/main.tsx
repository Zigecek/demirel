import { CircularProgress } from "@mui/material";
import React, { lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MessagesProvider } from "./contexts/MessagesContext";
import { NicknamesProvider } from "./contexts/NicknamesContext";
import { PgMonProvider } from "./contexts/PgMonContext";
import { SnackbarProvider } from "./contexts/SnackbarContext";
import { UserProvider } from "./contexts/UserContext";
import "./index.css";
import "./ws-client";

type LazyLoaderProps = {
  children: React.ReactNode;
};

export const colors = ["rgba(80, 150, 220, 1)", "rgba(80, 220, 150, 1)", "rgba(220, 150, 80, 1)", "rgba(220, 80, 150, 1)", "rgba(150, 80, 220, 1)", "rgba(150, 220, 80, 1)"];
export const suspiciousColor = "rgba(220, 75, 75, 1)";

const LazyLoader: React.FC<LazyLoaderProps> = ({ children }) => {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center items-center w-screen h-screen">
          <CircularProgress />
        </div>
      }>
      {children}
    </React.Suspense>
  );
};

const LazyApp = lazy(() => import("./pages/App"));
const LazyRegister = lazy(() => import("./pages/Register"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <LazyLoader>
        <LazyApp />
      </LazyLoader>
    ),
  },
  import.meta.env.MODE === "development"
    ? {
        path: "/register",
        element: (
          <LazyLoader>
            <LazyRegister />
          </LazyLoader>
        ),
      }
    : {},
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <MessagesProvider>
        <NicknamesProvider>
          <SnackbarProvider>
            <PgMonProvider>
              <RouterProvider router={router} />
            </PgMonProvider>
          </SnackbarProvider>
        </NicknamesProvider>
      </MessagesProvider>
    </UserProvider>
  </StrictMode>
);
