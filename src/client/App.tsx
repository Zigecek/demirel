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

  const sendNotification = () => {
    postWebPushSendNotification().then((res) => {
      snackbarConfig?.showSnackbar({
        text: res.message,
        severity: res.success ? "success" : "error",
      });
    });
  };

  const handleNotifikace = async () => {
    try {
      // 1. Žádost o oprávnění
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        // 2. Pokud oprávnění není uděleno, zobraz chybu v konzoli
        snackbarConfig?.showSnackbar({
          text: "You need to grant permission to send notifications",
          severity: "error",
        });
        return;
      }

      // 3. Kontrola, zda je uživatel již přihlášený k odběru
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Pokud není žádná registrace, vytvoří novou
        if (!import.meta.env.VITE_VAPID_PUBLIC) {
          snackbarConfig?.showSnackbar({
            text: "VAPID_PUBLIC not set",
            severity: "error",
          });
          return;
        }

        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC),
        });

        // Odeslání nové subscription na backend
        postWebPushSubscribe(newSubscription).then((res) => {
          if (res.success) {
            snackbarConfig?.showSnackbar({
              text: res.message,
              severity: "success",
            });
            // 4. Odeslání notifikace na backend
            sendNotification();
          } else {
            snackbarConfig?.showSnackbar({
              text: res.message,
              severity: "error",
            });
          }
        });
        return;
      }

      // 5. Odeslání notifikace na backend
      sendNotification();
    } catch (error) {
      console.error("Došlo k chybě při žádosti o notifikace:", error);
    }
  };

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.error("Service Worker není podporován v tomto prohlížeči.");
      return;
    }

    const registerServiceWorker = async () => {
      try {
        // 1. Registrace Service Workeru
        const registration = await navigator.serviceWorker.register("/service-worker.js");

        // 2. Detekce aktualizací Service Workeru
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  // Nová verze byla nainstalována, čeká na aktivaci
                  console.log("Nový Service Worker je připraven k použití.");
                  if (window.confirm("Je k dispozici aktualizace. Chcete ji aplikovat?")) {
                    window.location.reload();
                  }
                } else {
                  // Poprvé nainstalovaný SW
                  console.log("Service Worker byl úspěšně nainstalován poprvé.");
                }
              }
            };
          }
        };

        // 3. Odstraňování zastaralých SW
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("Service Worker se změnil, provádí se reload...");
          window.location.reload();
        });
      } catch (error) {
        console.error("Chyba při registraci Service Workeru:", error);
      }
    };

    registerServiceWorker();
  }, []);

  return (
    <div className="bg-gray-100">
      <div className="flex flex-row flex-wrap gap-2 m-2">
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Odhlásit
        </button>
        <button onClick={handleNotifikace} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
          Notifikace
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
        <Chart topic="zige/pozar0/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")}></Chart>
        <Chart topic="zige/pozar1/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")}></Chart>
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
