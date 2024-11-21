import React, { useEffect, useState } from "react";
import { postMqttToday } from "../../proxy/endpoints";
import { MaterialSymbol } from "react-material-symbols";
import { format, addMinutes } from "date-fns";
import { MqttValueType } from "@prisma/client";

type TodayElemProps = {
  topic: string;
  valueF?: (msg: string) => string;
};

export const TodayElem: React.FC<TodayElemProps> = ({ topic, valueF }) => {
  const [stats, setStats] = useState<postMqttTodayResponse>();

  const fetchToday = () => {
    if (!topic) return;
    postMqttToday({ topic }).then((res) => {
      if (res.success) {
        setStats(res.responseObject);
      }
    });
  };

  // periodically update stats
  useEffect(() => {
    fetchToday();
    const interval = setInterval(() => {
      fetchToday();
    }, 1000 * 60);

    return () => clearInterval(interval);
  }, [topic]);

  function formatTime(date: Date) {
    return format(addMinutes(date, date.getTimezoneOffset()), 'HH:mm:ss');
  }

  return (
    <>
      {stats && <h3 className="text-xl font-nadpis mt-2">Dnes</h3>}
      {stats && stats.valueType === MqttValueType.BOOLEAN && (
        <>
          <p className="text-base mt-2">
            <MaterialSymbol icon="radio_button_checked" size={18} fill={false} grade={-25} color="green" />
            <span className="font-semibold">: </span>
            {formatTime(new Date(stats.uptime as number))}
          </p>
          <p className="text-base mt-2">
            <MaterialSymbol icon="radio_button_unchecked" size={18} fill={false} grade={-25} color="red" />
            <span className="font-semibold">: </span> {formatTime(new Date(stats.downtime as number))}
          </p>
        </>
      )}

      {stats && stats.valueType === MqttValueType.FLOAT && (
        <>
          <p className="text-base mt-2">
            <MaterialSymbol icon="call_made" size={18} fill={false} grade={-25} color="red" />
            <span className="font-semibold">: </span>
            {valueF ? valueF(String(stats.max)) : stats.max}
          </p>
          <p className="text-base mt-2">
            <MaterialSymbol icon="show_chart" size={18} fill={false} grade={-25} color="orange" />
            <span className="font-semibold">: </span>
            {valueF ? valueF(String(stats.avg)) : stats.avg}
          </p>
          <p className="text-base mt-2">
            <MaterialSymbol icon="call_received" size={18} fill={false} grade={-25} color="blue" />
            <span className="font-semibold">: </span>
            {valueF ? valueF(String(stats.min)) : stats.min}
          </p>

          <p className="text-base mt-2">
            <MaterialSymbol icon="table_rows" size={18} fill={false} grade={-25} color="black" />
            <span className="font-semibold">: </span>
            {stats.count}
          </p>
        </>
      )}
    </>
  );
};
