import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Register from "./Register";
import { MessagesProvider } from "./contexts/MessagesContext";
import { NicknamesProvider } from "./contexts/NicknamesContext";
import { SnackbarProvider } from "./contexts/SnackbarContext";
import { UserProvider } from "./contexts/UserContext";
import "./index.css";
import "./ws-client";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
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
