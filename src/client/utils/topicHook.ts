// topicHook.ts
import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./WebSocketContext"; // Import the context

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
        const allowedInterval = lastMessageInterval * 1.5; // 150 % of the last interval
        setSuspicious(now.getTime() - timestamp.getTime() > allowedInterval);
      }

      const hardLimit = 2 * 60 * 1000; // 2 minutes
      if (now.getTime() - timestamp.getTime() > hardLimit) {
        setSuspicious(true); // Too much time since the last message
      }
    }
  };

  const handleUpdate = useCallback(() => {
    const msgs = messages.get(topic);
    if (!msgs || msgs.length === 0) {
      return;
    }

    const msg = msgs[msgs.length - 1]; // Get the last message

    // Update the last message interval
    if (timestamp) {
      const interval = msg.timestamp.getTime() - timestamp.getTime();
      setLastMessageInterval(interval);
    }

    // Update state with the new message data
    setLastMsgs(msgs); // Store all messages received
    setValue(msg.value); // Update the value state
    setTimestamp(msg.timestamp); // Update the timestamp
    setSuspicious(false); // Reset suspicious flag on new message
  }, [messages, topic, timestamp]);

  useEffect(() => {
    handleUpdate(); // Handle updates whenever messages or topic changes
  }, [messages, topic, handleUpdate]); // Added handleUpdate to dependencies

  useEffect(() => {
    // Set an interval to update the last updated time
    if (timestamp) {
      const interval = setInterval(updateLastUpdated, 1000); // Check every second
      updateLastUpdated(); // Initial call to set last updated immediately

      return () => {
        clearInterval(interval); // Clean up interval on unmount
      };
    }
  }, [timestamp]);

  return { value, lastUpdated, timestamp, suspicious, lastMsgs }; // Return the state
};
