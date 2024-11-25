import { Snackbar, Alert } from "@mui/material";
import React from "react";

type CustomSnackbarProps = {
  config: SnackBarConfig;
};

export const CustomSnackbar: React.FC<CustomSnackbarProps> = ({ config }) => {
  return (
    <Snackbar open={config.open} autoHideDuration={config.autoHideDuration} onClose={config.handleClose}>
      <Alert onClose={config.handleClose} severity={config.severity} variant="filled" sx={{ width: "100%" }}>
        {config.text}
      </Alert>
    </Snackbar>
  );
};

export const createDefaultConfig = (setConfig: React.Dispatch<React.SetStateAction<SnackBarConfig | undefined>>): SnackBarConfig => {
  const defaultConfig: SnackBarConfig = {
    open: false,
    text: "Default message",
    severity: "info",
    autoHideDuration: 6000,
    showSnackbar: (newConfig: Partial<SnackBarConfig>) => {
      setConfig({
        ...defaultConfig,
        ...newConfig,
        open: true,
      });
    },
    handleClose: () => {
      setConfig((prev) => ({ ...(prev as SnackBarConfig), open: false }));
    },
  };
  return defaultConfig;
};

export default CustomSnackbar;
