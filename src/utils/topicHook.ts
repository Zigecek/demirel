import { useEffect, useState } from "react";
import { socketEE } from "../ws-client";

export const useTopicValue = (topic: string) => {
  const [value, setValue] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<number | undefined>();
  const [whenEmitted, setWhenEmitted] = useState<number | undefined>();

  useEffect(() => {
    const handleUpdate = (msg: string) => {
      setValue(msg);
      setLastUpdated(0);
      setWhenEmitted(Date.now());
    };

    // Přihlásit se k topicu
    socketEE.on(topic, handleUpdate);

    // Interval pro sledování času od poslední aktualizace
    const interval = setInterval(() => {
      setLastUpdated((prev) => (prev !== undefined ? prev + 1 : undefined));
    }, 1000);

    // Vyčištění při unmount
    return () => {
      clearInterval(interval);
      socketEE.off(topic, handleUpdate);
    };
  }, [topic]);

  return { value, lastUpdated, whenEmitted };
};
