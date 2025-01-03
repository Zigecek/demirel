import { user } from "@prisma/client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getIfLoggedInAsync } from "../proxy/endpoints";

export type UserState = Omit<user, "password"> | null | false;

interface UserContextType {
  user: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
  chartLock: boolean;
  setChartLock: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserState>(null);
  const [chartLock, setChartLock] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getIfLoggedInAsync();
        if (!data.responseObject) {
          setUser(false);
          return false;
        }
        setUser(data.responseObject);
      } catch (error) {
        console.error("Error fetching user", error);
      }
    };
    fetchUser();
  }, []);

  return <UserContext.Provider value={{ user: user!, setUser: setUser, chartLock, setChartLock }}>{children}</UserContext.Provider>;
};
