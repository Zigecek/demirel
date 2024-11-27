import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../ws-client";

interface MessagesContextType {
  messages: MQTTMessage[];

  history: Record<string, MQTTMessage[]>;
  addToHistory: (msgs: MQTTMessage[]) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const useMessages = (): MessagesContextType => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a WMessagesProvider");
  }
  return context;
};

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<MessagesContextType["messages"]>([]);
  const [history, setHistory] = useState<MessagesContextType["history"]>({});

  const addToHistory = (msgs: MQTTMessage[]) => {
    if (msgs.length === 0) return;
    setHistory((prev) => {
      const newHistory = { ...prev };
      newHistory[msgs[0].topic] = [...msgs, ...(newHistory[msgs[0].topic] || [])];

      newHistory[msgs[0].topic] = newHistory[msgs[0].topic]
        .filter((value, index, self) => self.findIndex((v) => v.timestamp.getTime() === value.timestamp.getTime()) === index)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return newHistory;
    });
  };

  useEffect(() => {
    socket.on("messages", (msgs: MQTTMessageTransfer[]) => {
      setMessages(msgs.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) } as MQTTMessage)));
    });

    return () => {
      socket.off("messages");
    };
  }, []);

  return <MessagesContext.Provider value={{ messages, history, addToHistory }}>{children}</MessagesContext.Provider>;
};
