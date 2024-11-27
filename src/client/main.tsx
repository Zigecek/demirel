import React, { lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MessagesProvider } from "./contexts/MessagesContext";
import { NicknamesProvider } from "./contexts/NicknamesContext";
import { SnackbarProvider } from "./contexts/SnackbarContext";
import { UserProvider } from "./contexts/UserContext";
import "./index.css";
import "./ws-client";

type LazyLoaderProps = {
  children: React.ReactNode;
};

const LazyLoader: React.FC<LazyLoaderProps> = ({ children }) => {
  return <React.Suspense fallback={<div>Loading...</div>}>{children}</React.Suspense>;
};

const LazyApp = lazy(() => import("./pages/App"));
const LazyLogin = lazy(() => import("./pages/Login"));
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
  {
    path: "/login",
    element: (
      <LazyLoader>
        <LazyLogin />
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
            <RouterProvider router={router} />
          </SnackbarProvider>
        </NicknamesProvider>
      </MessagesProvider>
    </UserProvider>
  </StrictMode>
);
