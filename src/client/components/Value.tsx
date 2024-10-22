import React, { useEffect, useState } from "react";
import { useTopicValue } from "../utils/topicHook";
import { Graph } from "./Graph";

type ValueProps = {
  topic: string;
  valueF: (msg: string) => string;
};

export const Value: React.FC<ValueProps> = ({ topic, valueF }) => {
  const { value, lastUpdated, timestamp, suspicious } = useTopicValue(topic);
  const [dataPoints, setDataPoints] = useState<{ value: number; timestamp: number }[]>([]);

  useEffect(() => {
    if (value && timestamp) {
      console.log("Value: ", value, "Timestamp: ", timestamp);
      setDataPoints((prevData) => [
        ...prevData,
        { value: parseFloat(value), timestamp: timestamp }, // timestamp v ms pro graf
      ]);
    }
  }, [value, timestamp]);

  return (
    <div className="border border-gray-300 rounded-lg shadow-md p-4 m-2 w-56">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>
      <p className="text-2xl font-bold text-blue-500">{valueF(value)}</p>

      {lastUpdated != undefined && (
        <p className="text-xs text-gray-500 mt-2">
          Updated <span className={suspicious ? "text-red-600 font-bold" : "text-gray-500"}>{lastUpdated}</span> seconds ago
        </p>
      )}

      <Graph dataPoints={dataPoints} />
    </div>
  );
};
