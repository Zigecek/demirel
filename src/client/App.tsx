import { useState, useEffect } from "react";
import CustomSnackbar, { createDefaultConfig } from "./components/CustomSnackbar";
import { number, unit, fix, bool } from "./utils/values";
import { Value } from "./components/Value";
import { root } from "./utils/onRender";

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
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <button onClick={handleLogout} className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Logout
        </button>
        <div className="flex flex-wrap justify-center bg-white p-4 rounded shadow-md">
          <Value topic="zige/pozar1/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
          <Value topic="zige/pozar1/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
          <Value topic="zige/pozar1/fire/val" valueF={(v) => bool(v, "HOŘÍME!", "nehoříme.")} />
          <Value topic="zige/pozar0/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
          <Value topic="zige/pozar0/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
          <Value topic="zige/pozar0/fire/val" valueF={(v) => bool(v, "HOŘÍME!", "nehoříme.")} />
        </div>
      </div>
      {snackbarConfig && <CustomSnackbar config={snackbarConfig} />}
    </>
  );
}
