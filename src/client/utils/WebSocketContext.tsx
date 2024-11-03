import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../ws-client";

interface WebSocketContextType {
  messages: MQTTMessage[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<MQTTMessage[]>([]);

  useEffect(() => {
    socket.on("messages", (msgs: MQTTMessageTransfer[]) => {
      const topics: MQTTMessage[] = [];
      msgs.forEach((msg) => {
        const msgData = { ...msg, timestamp: new Date(msg.timestamp) };
        topics.push(msgData);
      });

      setMessages(topics);
    });

    return () => {
      socket.off("messages");
    };
  }, []);

  return <WebSocketContext.Provider value={{ messages }}>{children}</WebSocketContext.Provider>;
};
