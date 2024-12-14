import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../ws-client";

interface PgMonContextType {
  stats: PgMonStats | undefined;
}

const PgMonContext = createContext<PgMonContextType | undefined>(undefined);

export const usePgMon = (): PgMonContextType => {
  const context = useContext(PgMonContext);
  if (!context) {
    throw new Error("usePgMon must be used within a PgMonProvider");
  }
  return context;
};

export const PgMonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<PgMonStats>();

  useEffect(() => {
    socket.on("pgMon", (stats: PgMonStats) => {
      setStats(stats);
    });

    return () => {
      socket.off("pgMon");
    };
  }, []);

  return <PgMonContext.Provider value={{ stats }}>{children}</PgMonContext.Provider>;
};
