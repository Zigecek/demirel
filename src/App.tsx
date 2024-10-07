import { useState, useEffect } from "react";
import { socket } from "./ws-client";
import CustomSnackbar, { createDefaultConfig } from "./components/CustomSnackbar";
import { number, unit, fix } from "./utils/values";

import { Value } from "./components/Value";
import { getLogout } from "./proxy/endpoints";

export default function App() {
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [snackbarConfig, setSnackbarConfig] = useState<SnackBarConfig>();

  useEffect(() => {
    setSnackbarConfig(createDefaultConfig(setSnackbarConfig));
  }, []);

  socket.on("messages", (msgs: MQTTMessage[]) => {
    setMessages([...msgs, ...messages]);
  });

  const handleLogout = () => {
    getLogout((data) => {
      if (data.responseObject) {
        window.location.href = "/login";
      } else {
        snackbarConfig?.showSnackbar({
          text: "User not logged in",
          severity: "warn",
        });
      }
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <button onClick={handleLogout} className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Logout
        </button>
        <div className="flex flex-wrap justify-start bg-white p-4 rounded shadow-md">
          <Value topic="zige/pozar1/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
          <Value topic="zige/pozar1/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
        </div>
      </div>
      {snackbarConfig && <CustomSnackbar config={snackbarConfig} />}
    </>
  );
}
