import React from "react";
import { useTopic } from "../utils/topicHook";
import { TodayElem } from "./elementary/TodayElem";

type TodayProps = {
  topic: string;
  valueF?: (msg: string) => string;
};

export const Today: React.FC<TodayProps> = ({ topic, valueF }) => {
  const { value, suspicious } = useTopic(topic);

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>
      {valueF ? <p className={`text-2xl font-bold ${suspicious ? "text-red-600 font-bold" : "text-blue-500"}`}>{valueF(value.toString())}</p> : null}

      <TodayElem topic={topic} valueF={valueF} />
    </div>
  );
};
