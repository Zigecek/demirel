import React from "react";
import { MaterialSymbol } from "react-material-symbols";
import { format, addMinutes } from "date-fns";
import { useToday } from "../../utils/todayHook";

type TodayElemProps = {
  topic: string;
  valueF?: (msg: string) => string;
};

export const TodayElem: React.FC<TodayElemProps> = ({ topic, valueF }) => {
  const { stats } = useToday({ topic, valueF });

  function formatTime(date: Date) {
    return format(addMinutes(date, date.getTimezoneOffset()), "HH:mm:ss");
  }

  return (
    <>
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
