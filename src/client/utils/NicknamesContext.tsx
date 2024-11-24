import React, { createContext, useContext, useEffect, useState } from "react";
import { postMqttNickname } from "../proxy/endpoints";

interface NicknamesContextType {
  nickname: (topic: string) => string;
}

const NicknamesContext = createContext<NicknamesContextType | undefined>(undefined);

export const useNicknames = (): NicknamesContextType => {
  const context = useContext(NicknamesContext);
  if (!context) {
    throw new Error("useNicknames must be used within a NicknamesProvider");
  }
  return context;
};

export const NicknamesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  const fetchNicknames = async (topics: string[]) => {
    const response = await postMqttNickname({ topics });
    if (response.success) {
      setNicknames((prevNicknames) => ({
        ...prevNicknames,
        ...response.responseObject,
      }));
    }
  };

  const nickname = (topic: string) => {
    if (!nicknames[topic]) {
      if (nicknames[topic] !== topic) {
        nicknames[topic] = topic;
        fetchNicknames([topic]);
      }
      return topic; // Return the topic itself until the nickname is fetched
    }
    return nicknames[topic];
  };

  return <NicknamesContext.Provider value={{ nickname }}>{children}</NicknamesContext.Provider>;
};
