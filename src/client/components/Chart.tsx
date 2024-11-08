import React from "react";
import { Graph } from "./elementary/Graph";

type ChartProps = {
  topic: string;
  boolean?: boolean;
};

export const Chart: React.FC<ChartProps> = ({ topic, boolean = false }) => {

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>

      <Graph topic={topic} style={{height: "200px"}} boolean={boolean} />
    </div>
  );
};
