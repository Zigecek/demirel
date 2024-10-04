import { createContext, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import { socket } from "./ws-client";
import { getIfLoggedIn } from "./proxy/endpoints";
import "./index.css";

getIfLoggedIn((data) => {
  console.log(JSON.stringify(data));
  if (!data.responseObject) {
    if (window.location.pathname != "/login") window.location.href = "/login";
  }
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
