import { useEffect } from "react";
import { RuleSetup } from "../components/RuleSetup";
import { Chart } from "../components/valueDisplays/Chart";
import { DailyHistory } from "../components/valueDisplays/Stats";
import { Value } from "../components/valueDisplays/Value";
import { useNotification } from "../hooks/useNotification";
import { usePopup } from "../hooks/usePopup";
import { fix, number, unit } from "../utils/values";
import { socket } from "../ws-client";

export default function App() {
  const { testNotification } = useNotification();

  const { PopupComponent: NotificationPopup, showPopup } = usePopup(RuleSetup);

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <>
      <div className="bg-gray-100">
        <div className="flex flex-row flex-wrap gap-2 m-2">
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
          <Value topic="zige/pozar1/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
          <Value topic="zige/pozar1/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
          <Value topic="zige/pozar0/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
          <Value topic="zige/pozar0/12v/val" valueF={(v) => unit(fix(number(v), 1), "V")} />
        </div>
        <div>
          <Chart topics={["zige/pozar0/fire/val"]} boolean={true} />
          <Chart topics={["zige/pozar0/cerpadlo/val"]} boolean={true} />
          <DailyHistory topic="zige/pozar0/cerpadlo/val" hidden={true} />

          <Chart topics={["zige/pozar0/temp/val", "zige/pozar1/temp/val"]} />
          <DailyHistory topic="zige/pozar0/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
          <DailyHistory topic="zige/pozar1/temp/val" valueF={(v) => unit(fix(number(v), 1), "°C")} />
        </div>
      </div>
      {NotificationPopup}
    </>
  );
}
