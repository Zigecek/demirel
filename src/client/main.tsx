import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Register from "./Register";
import "./index.css";
import "./ws-client";
import { MessagesProvider } from "./utils/MessagesContext";
import { UserProvider } from "./utils/UserContext";
import { NicknamesProvider } from "./utils/NicknamesContext";

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
          <RouterProvider router={router} />
        </NicknamesProvider>
      </MessagesProvider>
    </UserProvider>
  </StrictMode>
);
