import React from "react";
import { Graph } from "./elementary/Graph";
import { TodayElem } from "./elementary/TodayElem";

type ChartProps = {
  topic: string;
  boolean?: boolean;
  valueF?: (msg: string) => string;
};

export const Chart: React.FC<ChartProps> = ({ topic, boolean = false, valueF }) => {
  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>

      <div className="flex flex-row">
        <div className="flex-1 w-full max-w-full" style={{ height: "200px" }}>
          <Graph topic={topic} boolean={boolean} />
        </div>
        <div className="m-5">
          <TodayElem topic={topic} valueF={valueF} />
        </div>
      </div>
    </div>
  );
};
