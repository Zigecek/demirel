// context responsible for managing the dark mode state and syncing it with db

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { postDark } from "../proxy/endpoints";
import { useSnackbarContext } from "./SnackbarContext";
import { useUser } from "./UserContext";

type DarkContextType = {
  dark: boolean;
  toggleDark: () => void;
};

const DarkContext = createContext<DarkContextType | undefined>(undefined);

const defaultDark = false;

export const useDark = () => {
  const context = useContext(DarkContext);
  if (!context) {
    throw new Error("useDark must be used within a DarkProvider");
  }
  return context;
};

export const DarkProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [dark, setDark] = useState<DarkContextType["dark"]>(defaultDark);
  const [systemDark, setSystemDark] = useState<boolean | null>(null);
  const { showSnackbar } = useSnackbarContext();

  // load system dark mode
  useEffect(() => {
    setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  useEffect(() => {
    if (!user || user.darkMode === null) {
      setDark(systemDark || defaultDark);
      return;
    }
    setDark(user.darkMode);
  }, [systemDark, user]);

  const toggleDark = (state?: boolean) => {
    if (!user) return;

    const newDark = state ?? !dark;
    setDark(newDark);

    postDark({ dark: newDark }).then((res) => {
      if (!res.success) {
        showSnackbar?.({
          text: "Nastala chyba při ukládání nastavení",
          severity: "error",
        });
      }
    });
  };

  return (
    <DarkContext.Provider value={{ dark, toggleDark }}>
      <div className={`${dark ? "dark" : "white"}`}>{children}</div>
    </DarkContext.Provider>
  );
};
