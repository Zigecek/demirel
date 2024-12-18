import { CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { LoginForm } from "../components/LoginForm";
import { RuleSetup } from "../components/RuleSetup";
import { Chart } from "../components/valueDisplays/Chart";
import { DailyHistory } from "../components/valueDisplays/Stats";
import { Value } from "../components/valueDisplays/Value";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../hooks/useNotification";
import { usePopup } from "../hooks/usePopup";
import { fix, number, unit, unundefined } from "../utils/values";
import { socket } from "../ws-client";

export default function App() {
  const { testNotification } = useNotification();
  const { PopupComponent: NotificationPopup, showPopup, isVisible } = usePopup(RuleSetup);
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === null) {
      setLoading(true);
    } else if (user === false) {
      setLoading(false);
    } else {
      setLoading(false);
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [user]);
  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center w-screen h-screen">
          <CircularProgress />
        </div>
      ) : (
        <>
          <div
            className={`min-h-screen w-screen flex items-center justify-center bg-gray-500 bg-opacity-75 fixed backdrop-blur-0.5 duration-1000 ${
              user === false ? "visible opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}>
            <LoginForm className={`duration-100 ${user === false ? "visible opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} />
          </div>
          <div className={`bg-gray-100 ${user === false || isVisible ? "overflow-hidden h-screen" : ""}`}>
            <div className="flex flex-row flex-wrap gap-2 p-2">
              <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Odhlásit
              </button>
              <button onClick={testNotification} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
                Zapnout notifikace
              </button>
              <button onClick={showPopup} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                Programovatelné notifikace
              </button>
            </div>
            <div className="flex flex-row items-center justify-center box-border flex-wrap">
              <Value topic="zige/pozar1/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Value topic="zige/pozar1/12v/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "V")} />
              <Value topic="zige/pozar0/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Value topic="zige/pozar0/12v/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "V")} />
              <Value topic="zige/meteo/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Value topic="zige/meteo/hum/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "%")} />
              <Value topic="zige/meteo/press/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "hPa")} />
              <Value topic="zige/meteo/wind/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "km/h")} />
            </div>
            <div>
              <Chart topics={["zige/pozar0/cerpadlo/val"]} boolean={true} valueF={(v) => unundefined(v, "---")} />
              <DailyHistory topic="zige/pozar0/cerpadlo/val" hidden={true} valueF={(v) => unundefined(v, "---")} />

              <Chart topics={["zige/pozar0/temp/val", "zige/pozar1/temp/val", "zige/meteo/temp/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <DailyHistory topic="zige/pozar0/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <DailyHistory topic="zige/pozar1/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <DailyHistory topic="zige/meteo/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Chart topics={["zige/meteo/hum/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "%")} />
              <Chart topics={["zige/meteo/press/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "hPa")} />
              <DailyHistory topic="zige/meteo/hum/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "%")} />
              <DailyHistory topic="zige/meteo/press/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "hPa")} />
            </div>
            <h3>Vývoj:</h3>
            <div>
              <Chart topics={["zige/meteo/anemoscope/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°")} />
            </div>
          </div>
        </>
      )}
      {NotificationPopup}
    </div>
  );
}
