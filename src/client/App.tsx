import { useState, useEffect } from "react";
import CustomSnackbar, { createDefaultConfig } from "./components/CustomSnackbar";
import { number, unit, fix, bool } from "./utils/values";
import { Value } from "./components/Value";
import { root } from "./utils/onRender";
import { Chart } from "./components/Chart";

export default function App() {
  const [snackbarConfig, setSnackbarConfig] = useState<SnackBarConfig>();

  useEffect(() => {
    root();
  }, []);

  useEffect(() => {
    setSnackbarConfig(createDefaultConfig(setSnackbarConfig));
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <div className="bg-gray-100">
      <button onClick={handleLogout} className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
        Logout
      </button>
      <div className="flex flex-row items-center justify-center box-border flex-wrap">
        <Value topic="zige/pozar1/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
        <Value topic="zige/pozar1/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
        <Value topic="zige/pozar0/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
        <Value topic="zige/pozar0/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
      </div>
      <div>
        <Chart topic="zige/pozar0/cerpadlo/val"></Chart>
        <Chart topic="zige/pozar0/temp/val"></Chart>
        <Chart topic="zige/pozar1/temp/val"></Chart>
      </div>
      {snackbarConfig && <CustomSnackbar config={snackbarConfig} />}
    </div>
  );
}
