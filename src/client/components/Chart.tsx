import React from "react";
import { Graph } from "./Graph";

type ChartProps = {
  topic: string;
};

export const Chart: React.FC<ChartProps> = ({ topic }) => {

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>

      <Graph topic={topic} style={{height: "200px"}} />
    </div>
  );
};
