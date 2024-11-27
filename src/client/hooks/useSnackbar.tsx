import { useEffect, useState } from "react";
import CustomSnackbar, { createDefaultConfig } from "../components/CustomSnackbar";

export const useSnackbar = (): [SnackBarConfig | undefined, React.ReactNode] => {
  const [snackbarConfig, setSnackbarConfig] = useState<SnackBarConfig>();

  useEffect(() => {
    setSnackbarConfig(createDefaultConfig(setSnackbarConfig));
  }, []);

  const SnackbarComponent = snackbarConfig ? <CustomSnackbar config={snackbarConfig} /> : null;

  return [snackbarConfig, SnackbarComponent];
};
