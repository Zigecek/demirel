import React, { useEffect } from "react";
import { useTopicValue } from "../utils/topicHook";

type ValueProps = {
  topic: string;
  valueF: (msg: string) => string;
};

export const Value: React.FC<ValueProps> = ({ topic, valueF }) => {
  const { value, lastUpdated } = useTopicValue(topic);

  return (
    <div className="border border-gray-300 rounded-lg shadow-md p-4 m-2 w-56">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>
      <p className="text-2xl font-bold text-blue-500">{valueF(value)}</p>

      {lastUpdated != undefined && <p className="text-xs text-gray-500 mt-2">Updated {lastUpdated} seconds ago</p>}
    </div>
  );
};
