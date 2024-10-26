import { useEffect, useState, useCallback } from "react";
import { socketEE } from "../ws-client";

export const useTopicValue = (topic: string) => {
  const [value, setValue] = useState<MQTTMessageNew["value"]>("");
  const [lastMsgs, setLastMsgs] = useState<Omit<MQTTMessageNew, "topic">[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>();
  const [timestamp, setTimestamp] = useState<Date>();
  const [suspicious, setSuspicious] = useState<boolean>(false);
  const [lastMessageInterval, setLastMessageInterval] = useState<number | undefined>(undefined); // změněno na useState

  const updateLastUpdated = () => {
    if (timestamp) {
      const now = new Date();
      const timeSinceLastMessage = (now.getTime() - timestamp.getTime()) / 1000; // čas od poslední zprávy v sekundách
      setLastUpdated(Math.round(timeSinceLastMessage));

      // 1. Ověření podle intervalu mezi zprávami
      if (lastMessageInterval) {
        const allowedInterval = lastMessageInterval * 1.5; // 150 % posledního intervalu
        if (now.getTime() - timestamp.getTime() > allowedInterval) {
          setSuspicious(true); // zpráva přišla později než 150 % intervalu
        } else {
          setSuspicious(false);
        }
      }

      // 2. Hard limit (např. 2 minuty)
      const hardLimit = 2 * 60 * 1000; // 2 minuty v milisekundách
      if (now.getTime() - timestamp.getTime() > hardLimit) {
        setSuspicious(true); // příliš dlouhá doba od první zprávy
      }
    }
  };

  const handleUpdate = useCallback((msgs: Omit<MQTTMessageNew, "topic">[]) => {
    if (!msgs.length) {
      return;
    }
    // Získat poslední zprávu (ignoruje jiné zprávy, např. z db)
    const msg = msgs.pop() as Omit<MQTTMessageNew, "topic">;
    if (topic == "zige/pozar1/temp/val") console.log(msg.value, msg.timestamp.toISOString());

    // Pokud již máme uložený čas předchozí zprávy
    if (timestamp) {
      const interval = msg.timestamp.getTime() - timestamp.getTime(); // rozdíl mezi touto a předchozí zprávou
      setLastMessageInterval(interval); // aktualizujeme lastMessageInterval
    }

    //console.log(msg.value, topic);

    // Uložit hodnotu a timestamp aktuální zprávy
    setLastMsgs(msgs);
    setValue(msg.value);
    setTimestamp(msg.timestamp);
    setSuspicious(false); // resetovat suspicious při nové zprávě
  }, []);

  useEffect(() => {
    // Přihlásit se k topicu
    socketEE.on(topic, handleUpdate);

    // Vyčištění při unmount
    return () => {
      socketEE.off(topic, handleUpdate);
    };
  }, [topic, timestamp, handleUpdate]); // Přidáno timestamp jako závislost

  useEffect(() => {
    if (timestamp) {
      const interval = setInterval(updateLastUpdated, 1000); // kontrolovat každou sekundu
      updateLastUpdated(); // okamžitě zkontrolovat

      return () => {
        clearInterval(interval);
      };
    }
  }, [timestamp]);

  return { value, lastUpdated, timestamp, suspicious, lastMsgs };
};
