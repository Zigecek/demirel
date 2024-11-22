import React, { useEffect, useState } from "react";
import { postMqttToday } from "../../proxy/endpoints";
import { MaterialSymbol } from "react-material-symbols";
import { format, addMinutes } from "date-fns";
import { useMessages } from "../../utils/MessagesContext";
import { calculateStats, getDayDates } from "../../../globals/daily";

type TodayElemProps = {
  topic: string;
  valueF?: (msg: string) => string;
};

export const TodayElem: React.FC<TodayElemProps> = ({ topic, valueF }) => {
  const { history } = useMessages();
  const [stats, setStats] = useState<dailyStats>();

  useEffect(() => {
    if (!history) return;
    if (!topic) return;
    if (!history[topic]) return;

    const { start, end } = getDayDates(new Date());
    const todayMsgs = history[topic].filter((msg) => msg.timestamp > start && msg.timestamp < end);
    if (todayMsgs.length == 0) return;

    const calcs = calculateStats(todayMsgs, start, end);

    setStats(calcs);
  }, [history]);

  function formatTime(date: Date) {
    return format(addMinutes(date, date.getTimezoneOffset()), "HH:mm:ss");
  }

  return (
    <>
      {stats && <h3 className="text-xl font-light mt-2">Dnes</h3>}
      {stats && stats.valueType === "BOOLEAN" && (
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

      {stats && stats.valueType === "FLOAT" && (
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
