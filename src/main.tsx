import { createContext, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import App from './App';
import { socket } from './ws-client';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
]);

export const globalContext = createContext(socket);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <globalContext.Provider value={socket}>
      <RouterProvider router={router} />
    </globalContext.Provider>
  </StrictMode>,
)
