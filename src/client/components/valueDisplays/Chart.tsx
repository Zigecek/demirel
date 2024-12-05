import React from "react";
import { useNicknames } from "../../contexts/NicknamesContext";
import { useTopics } from "../../hooks/useTopics";
import { colors, Graph } from "./elementary/Graph";

type ChartProps = {
  topics: string[];
  boolean?: boolean;
  valueF?: (msg: string) => string;
};

export const Chart: React.FC<ChartProps> = ({ topics, boolean = false, valueF = (msg: string) => msg }) => {
  const { nickname } = useNicknames();
  const { values } = useTopics(topics);
  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <h2 className="text-xl mb-2">
        <span className="font-semibold">Graf: </span>
        {topics.map((t, i) => {
          return (
            <>
              <span key={i}>
                {nickname(t)}
                <span className="font-semibold" style={{ color: colors[i] }}>
                  {" "}
                  {valueF(String(values[t]))}{" "}
                </span>
              </span>
            </>
          );
        })}
      </h2>

      <div className="flex flex-row">
        <div className="flex-1 w-full max-w-full" style={{ height: boolean ? "200px" : topics.length * 30 + 300 }}>
          <Graph topics={topics} boolean={boolean} />
        </div>
      </div>
    </div>
  );
};
