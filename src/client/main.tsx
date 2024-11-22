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
import 'react-material-symbols/rounded';
import 'react-material-symbols/outlined';

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
        <RouterProvider router={router} />
      </MessagesProvider>
    </UserProvider>
  </StrictMode>
);
