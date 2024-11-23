import React from "react";
import { useTopic } from "../utils/topicHook";

type ValueProps = {
  topic: string;
  valueF: (msg: string) => string;
};

export const Value: React.FC<ValueProps> = ({ topic, valueF }) => {
  const { value, lastUpdated, suspicious } = useTopic(topic);

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <h2 className="text-xl mb-2">
        <span className="font-semibold">Aktuálně: </span>
        {topic}
      </h2>
      <p className={`text-2xl font-bold ${suspicious ? "text-red-600 font-bold" : "text-blue-500"}`}>{valueF(value.toString())}</p>

      {lastUpdated != undefined && (
        <p className="text-xs text-gray-500 mt-2">
          Před <span className={suspicious ? "text-red-600 font-bold" : "text-gray-500"}>{lastUpdated}</span> vteřinami
        </p>
      )}
    </div>
  );
};
