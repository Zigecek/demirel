import React, { useEffect, useState } from "react";
import { useTopicValue } from "../utils/topicHook";
import { Graph } from "./Graph";

type ValueProps = {
  topic: string;
  valueF: (msg: string) => string;
};

export const Value: React.FC<ValueProps> = ({ topic, valueF }) => {
  const { value, lastUpdated, timestamp, suspicious, lastMsgs } = useTopicValue(topic);

  return (
    <div className="border border-gray-300 rounded-lg shadow-md p-2 m-1 w-72">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>
      <p className={`text-2xl font-bold ${suspicious ? "text-red-600 font-bold" : "text-blue-500"}`}>{valueF(value.toString())}</p>

      {lastUpdated != undefined && (
        <p className="text-xs text-gray-500 mt-2">
          Updated <span className={suspicious ? "text-red-600 font-bold" : "text-gray-500"}>{lastUpdated}</span> seconds ago
        </p>
      )}
      <Graph topic={topic} />
    </div>
  );
};
