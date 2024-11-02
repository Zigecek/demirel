import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./WebSocketContext";

export const useTopicValue = (topic: string) => {
  const { messages } = useWebSocket();
  const [value, setValue] = useState<MQTTMessageNew["value"]>("");
  const [lastMsgs, setLastMsgs] = useState<Omit<MQTTMessageNew, "topic">[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>();
  const [timestamp, setTimestamp] = useState<Date>();
  const [suspicious, setSuspicious] = useState<boolean>(false);
  const [lastMessageInterval, setLastMessageInterval] = useState<number | undefined>(undefined);

  const updateLastUpdated = () => {
    if (timestamp) {
      const now = new Date();
      const timeSinceLastMessage = (now.getTime() - timestamp.getTime()) / 1000;
      setLastUpdated(Math.round(timeSinceLastMessage));

      if (lastMessageInterval) {
        const allowedInterval = lastMessageInterval * 1.5;
        setSuspicious(now.getTime() - timestamp.getTime() > allowedInterval);
      }

      const hardLimit = 2 * 60 * 1000;
      if (now.getTime() - timestamp.getTime() > hardLimit) {
        setSuspicious(true);
      }
    }
  };

  const handleUpdate = useCallback(() => {
    const msgs = [...(messages.get(topic) || [])];
    if (!msgs.length) return;
    if (msgs.length == 0) return;

    const msg = msgs.pop();
    if (!msg) return;

    if (timestamp) {
      const interval = msg.timestamp.getTime() - timestamp.getTime();
      setLastMessageInterval(interval);
    }

    if (msgs.length > 0) setLastMsgs(msgs);
    setValue(msg.value);
    setTimestamp(msg.timestamp);
    setSuspicious(false);
  }, [messages]);

  useEffect(() => {
    handleUpdate();
  }, [messages, topic]);

  useEffect(() => {
    if (timestamp) {
      const interval = setInterval(updateLastUpdated, 1000);
      updateLastUpdated();

      return () => {
        clearInterval(interval);
      };
    }
  }, [timestamp]);

  return { value, lastUpdated, timestamp, suspicious, lastMsgs };
};
