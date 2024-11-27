import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import CustomSnackbar, { createDefaultConfig } from "../components/CustomSnackbar";

// Typ kontextu
interface SnackbarContextValue {
  snackbarConfig: SnackBarConfig | undefined;
  showSnackbar: (props: Partial<SnackBarConfig>) => void;
}

// Vytvoření kontextu
const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

// Poskytovatel
export const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [snackbarConfig, setSnackbarConfig] = useState<SnackBarConfig>();

  useEffect(() => {
    setSnackbarConfig(createDefaultConfig(setSnackbarConfig));
  }, []);

  // Funkce pro zobrazení snackbaru
  const showSnackbar = (props: Partial<SnackBarConfig>) => {
    if (snackbarConfig && snackbarConfig.showSnackbar) {
      snackbarConfig.showSnackbar(props);
    }
  };

  return (
    <SnackbarContext.Provider value={{ snackbarConfig, showSnackbar }}>
      {children}
      {snackbarConfig && <CustomSnackbar config={snackbarConfig} />}
    </SnackbarContext.Provider>
  );
};

// Hook pro použití kontextu
export const useSnackbarContext = (): SnackbarContextValue => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbarContext must be used within a SnackbarProvider");
  }
  return context;
};
