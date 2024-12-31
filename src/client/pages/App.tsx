import { CircularProgress, Switch } from "@mui/material";
import { useEffect, useState } from "react";
import { BiCustomize } from "react-icons/bi";
import { IoMdNotificationsOutline } from "react-icons/io";
import { IoLogOutOutline } from "react-icons/io5";
import { MdOutlineDarkMode, MdOutlineLightMode } from "react-icons/md";
import { LoginForm } from "../components/LoginForm";
import { RuleSetup } from "../components/RuleSetup";
import { Chart } from "../components/valueDisplays/Chart";
import { AverageValue } from "../components/valueDisplays/elementary/AverageValue";
import { DailyHistory } from "../components/valueDisplays/Stats";
import { Value } from "../components/valueDisplays/Value";
import { useDark } from "../contexts/DarkContext";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../hooks/useNotification";
import { usePopup } from "../hooks/usePopup";
import { fix, number, unit, unundefined } from "../utils/values";
import { socket } from "../ws-client";

export default function App() {
  const { testNotification } = useNotification();
  const { PopupComponent: NotificationPopup, showPopup, isVisible } = usePopup(RuleSetup);
  const { user, setChartLock, chartLock } = useUser();
  const [loading, setLoading] = useState(true);
  const { toggleDark, dark } = useDark();

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
    window.location.href = "/api/user/logout";
  };

  return (
    <div className="text-black dark:text-white">
      {loading ? (
        <div className="flex justify-center items-center w-screen h-screen">
          <CircularProgress />
        </div>
      ) : (
        <>
          <div
            className={`z-20 min-h-screen w-screen flex items-center justify-center bg-neutral-500 bg-opacity-75 fixed backdrop-blur-0.5 duration-1000 ${
              user === false ? "visible opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}>
            <LoginForm className={`duration-100 ${user === false ? "visible opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} />
          </div>
          <div className="z-10 flex flex-row flex-wrap gap-1 p-2 bg-neutral-100 dark:bg-neutral-900 border-b-neutral-700 border-b sticky top-0 shadow-lg dark:shadow-neutral-800">
            <button onClick={showPopup} className="px-4 py-2 bg-neutral-500 text-white rounded hover:bg-neutral-600 dark:hover:bg-neutral-400">
              <BiCustomize size={20} />
            </button>
            <Switch
              value={!chartLock}
              onChange={(e) => {
                setChartLock((prev) => !prev);
              }}
            />
            <div className="ml-auto flex justify-center items-center px-2">
              <AverageValue topics={["zige/pozar1/12v/val", "zige/pozar0/12v/val", "zige/meteo/12v/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "V")} />
            </div>
            <button onClick={testNotification} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 dark:hover:bg-orange-400">
              <IoMdNotificationsOutline size={20} />
            </button>
            <button
              onClick={() => {
                toggleDark();
              }}
              className="flex justify-center items-center px-4 py-2 bg-neutral-300 dark:bg-neutral-700 text-white rounded hover:bg-neutral-500 ">
              {dark ? <MdOutlineLightMode /> : <MdOutlineDarkMode />}
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 dark:hover:bg-red-400">
              <IoLogOutOutline size={20} />
            </button>
          </div>
          <div className={`z-0 bg-neutral-100 dark:bg-neutral-900 ${user === false || isVisible ? "overflow-hidden h-screen" : ""}`}>
            <div className="flex flex-row justify-center box-border flex-wrap items-stretch">
              <Value topic="zige/pozar1/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Value topic="zige/pozar0/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Value topic="zige/meteo/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Value topic="zige/meteo/hum/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "%")} />
              <Value topic="zige/meteo/press/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "hPa")} />
              <Value topic="zige/meteo/wind/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "m/s")} />
            </div>
            <div>
              <Chart topics={["zige/pozar0/cerpadlo/val"]} boolean={true} valueF={(v) => unundefined(v, "---")} />
              <DailyHistory topic="zige/pozar0/cerpadlo/val" hidden={true} valueF={(v) => unundefined(v, "---")} />

              <Chart topics={["zige/pozar0/temp/val", "zige/pozar1/temp/val", "zige/meteo/temp/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <DailyHistory topic="zige/pozar0/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <DailyHistory topic="zige/pozar1/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <DailyHistory topic="zige/meteo/temp/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "°C")} />
              <Chart topics={["zige/meteo/hum/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "%")} />
              <DailyHistory topic="zige/meteo/hum/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "%")} />
              <Chart topics={["zige/meteo/press/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "hPa")} />
              <DailyHistory topic="zige/meteo/press/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "hPa")} />
              <Chart topics={["zige/meteo/wind/val"]} valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "m/s")} />
              <DailyHistory topic="zige/meteo/wind/val" valueF={(v) => unit(unundefined(fix(number(v), 1), "---"), "m/s")} />
            </div>
          </div>
        </>
      )}
      {NotificationPopup}
    </div>
  );
}
