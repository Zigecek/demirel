import { useState, useEffect } from "react";
import { postWebPushSendNotification, postWebPushSubscribe } from "../proxy/endpoints";
import SnackBarConfig from "../components/CustomSnackbar";

export const useNotification = (snackbarConfig: SnackBarConfig | undefined) => {
  const [permission, setPermission] = useState<NotificationPermission>();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.error("Service Worker není podporován v tomto prohlížeči.");
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/service-worker.js");

        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  console.log("Nový Service Worker je připraven k použití.");
                  if (window.confirm("Je k dispozici aktualizace. Chcete ji aplikovat?")) {
                    window.location.reload();
                  }
                } else {
                  console.log("Service Worker byl úspěšně nainstalován poprvé.");
                }
              }
            };
          }
        };

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

  const handleNotifikace = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== "granted") {
        snackbarConfig?.showSnackbar({
          text: "You need to grant permission to send notifications",
          severity: "error",
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
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

        postWebPushSubscribe(newSubscription).then((res) => {
          if (res.success) {
            snackbarConfig?.showSnackbar({
              text: res.message,
              severity: "success",
            });
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

      sendNotification();
    } catch (error) {
      console.error("Došlo k chybě při žádosti o notifikace:", error);
    }
  };

  const sendNotification = () => {
    postWebPushSendNotification().then((res) => {
      snackbarConfig?.showSnackbar({
        text: res.message,
        severity: res.success ? "success" : "error",
      });
    });
  };

  return { handleNotifikace, permission };
};

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
