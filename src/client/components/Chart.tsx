import React from "react";
import { Graph } from "./elementary/Graph";

type ChartProps = {
  topics: string[];
  boolean?: boolean;
};

export const Chart: React.FC<ChartProps> = ({ topics, boolean = false }) => {
  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <h2 className="text-xl mb-2">
        <span className="font-semibold">Graf: </span>
        {topics.join(", ")}
      </h2>

      <div className="flex flex-row">
        <div className="flex-1 w-full max-w-full" style={{ height: "200px" }}>
          <Graph topics={topics} boolean={boolean} />
        </div>
      </div>
    </div>
  );
};
