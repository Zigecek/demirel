// WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../ws-client"; // Import your socket instance

const WebSocketContext = createContext<any>(null);

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Map<string, Omit<MQTTMessageNew, "topic">[]>>(new Map());

  useEffect(() => {
    socket.on("messages", (msgs: (MQTTMessageNew & { timestamp: number })[]) => {
      const topics = new Map<string, Omit<MQTTMessageNew, "topic">[]>();
      msgs.forEach((msg) => {
        const topic = msg.topic;
        const msgData = { ...msg, timestamp: new Date(msg.timestamp) };

        if (!topics.has(topic)) {
          topics.set(topic, []);
        }
        topics.get(topic)?.push(msgData);
      });

      setMessages((prev) => {
        const updated = new Map(prev);
        topics.forEach((msgs, topic) => {
          updated.set(topic, msgs);
        });
        return updated;
      });
    });

    return () => {
      socket.off("messages");
    };
  }, []);

  return <WebSocketContext.Provider value={{ messages }}>{children}</WebSocketContext.Provider>;
};
