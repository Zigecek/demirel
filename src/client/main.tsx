import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, redirect, RouterProvider } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Register from "./Register";
import "./index.css";
import "./ws-client";
import { rootLoader } from "./utils/loaders";
import { WebSocketProvider } from "./utils/WebSocketContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    loader: rootLoader,
  },
  {
    path: "/login",
    element: <Login />,
  },
  import.meta.env.MODE === "development"
    ? {
        path: "/register",
        element: <Register />,
      }
    : {},
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
  </StrictMode>
);
