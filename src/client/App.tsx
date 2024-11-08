import { useState, useEffect } from "react";
import CustomSnackbar, { createDefaultConfig } from "./components/CustomSnackbar";
import { number, unit, fix } from "./utils/values";
import { Value } from "./components/Value";
import { Chart } from "./components/Chart";
import { postWebPushSendNotification, postWebPushSubscribe } from "./proxy/endpoints";
import { socket } from "./ws-client";

export default function App() {
  const [snackbarConfig, setSnackbarConfig] = useState<SnackBarConfig>();

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setSnackbarConfig(createDefaultConfig(setSnackbarConfig));
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const handleNotifikace = () => {
    postWebPushSendNotification().then((res) => {
      snackbarConfig?.showSnackbar({
        text: res.message,
        severity: res.success ? "success" : "error",
      });
    });
  };

  const subscribeToPushNotifications = () => {
    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC;

    if (!publicVapidKey) {
      snackbarConfig?.showSnackbar({
        text: "VAPID_PUBLIC not set",
        severity: "error",
      });
      return;
    }
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC),
        })
        .then((subscription) => {
          postWebPushSubscribe(subscription).then((res) => {
            if (res.success) {
              snackbarConfig?.showSnackbar({
                text: res.message,
                severity: "success",
              });
            } else {
              snackbarConfig?.showSnackbar({
                text: res.message,
                severity: "error",
              });
            }
          });
        });
    });
  };

  useEffect(() => {
    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC;

    if (!publicVapidKey) {
      console.error("VAPID_PUBLIC not set");
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js");
    }
  }, []);

  return (
    <div className="bg-gray-100">
      <div className="flex flex-row flex-wrap gap-2 m-2">
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Logout
        </button>
        <button onClick={subscribeToPushNotifications} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Přihlásit notifikace
        </button>
        <button onClick={handleNotifikace} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
          Odeslat notifikaci
        </button>
      </div>
      <div className="flex flex-row items-center justify-center box-border flex-wrap">
        <Value topic="zige/pozar1/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
        <Value topic="zige/pozar1/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
        <Value topic="zige/pozar0/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
        <Value topic="zige/pozar0/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
      </div>
      <div>
        <Chart topic="zige/pozar0/cerpadlo/val" boolean={true}></Chart>
        <Chart topic="zige/pozar0/temp/val"></Chart>
        <Chart topic="zige/pozar1/temp/val"></Chart>
      </div>
      {snackbarConfig && <CustomSnackbar config={snackbarConfig} />}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
