import { useEffect, useState } from "react";
import { socketEE } from "../ws-client";

export const useTopicValue = (topic: string) => {
  const [value, setValue] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<number>();
  const [timestamp, setTimestamp] = useState<number>();
  const [suspicious, setSuspicious] = useState<boolean>(false);
  const [lastMessageInterval, setLastMessageInterval] = useState<number | undefined>(undefined); // změněno na useState

  const updateLastUpdated = () => {
    if (timestamp) {
      const now = Date.now();
      const timeSinceLastMessage = (now - timestamp) / 1000; // čas od poslední zprávy v sekundách
      setLastUpdated(Math.round(timeSinceLastMessage));

      // 1. Ověření podle intervalu mezi zprávami
      if (lastMessageInterval) {
        const allowedInterval = lastMessageInterval * 1.5; // 150 % posledního intervalu
        if (now - timestamp > allowedInterval) {
          setSuspicious(true); // zpráva přišla později než 150 % intervalu
        } else {
          setSuspicious(false);
        }
      }

      // 2. Hard limit (např. 2 minuty)
      const hardLimit = 2 * 60 * 1000; // 2 minuty v milisekundách
      if (now - timestamp > hardLimit) {
        setSuspicious(true); // příliš dlouhá doba od první zprávy
      }
    }
  };

  useEffect(() => {
    const handleUpdate = (msg: Omit<MQTTMessage, "topic">) => {
      const now = msg.timestamp;

      // Pokud již máme uložený čas předchozí zprávy
      if (timestamp) {
        const interval = now - timestamp; // rozdíl mezi touto a předchozí zprávou
        setLastMessageInterval(interval); // aktualizujeme lastMessageInterval
      }

      // Uložit hodnotu a timestamp aktuální zprávy
      setValue(msg.message);
      setTimestamp(now);
      setSuspicious(false); // resetovat suspicious při nové zprávě
    };

    // Přihlásit se k topicu
    socketEE.on(topic, handleUpdate);

    // Vyčištění při unmount
    return () => {
      socketEE.removeListener(topic, handleUpdate);
    };
  }, [topic, timestamp]); // Přidáno timestamp jako závislost

  useEffect(() => {
    if (timestamp) {
      const interval = setInterval(updateLastUpdated, 1000); // kontrolovat každou sekundu
      updateLastUpdated(); // okamžitě zkontrolovat

      return () => {
        clearInterval(interval);
      };
    }
  }, [timestamp]);

  return { value, lastUpdated, suspicious };
};
