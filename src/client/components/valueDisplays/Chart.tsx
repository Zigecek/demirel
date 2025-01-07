import React from "react";
import { useNicknames } from "../../contexts/NicknamesContext";
import { useTopics } from "../../hooks/useTopics";
import { colors } from "../../main";
import { Graph } from "./elementary/Graph";

type ChartProps = {
  topics: string[];
  boolean?: boolean;
  valueF?: (msg: any) => string;
  className?: string;
};

export const Chart: React.FC<ChartProps> = ({ topics, boolean = false, valueF = (msg: any) => msg, className = "" }) => {
  const { nickname } = useNicknames();
  const { values } = useTopics(topics);
  return (
    <div className={`bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-md p-2 m-1 ${className}`}>
      <h2 className="text-xl mb-2">
        {topics.map((t, i) => {
          return (
            <span key={i}>
              {nickname(t)}
              {":"}
              <span className="font-semibold" style={{ color: colors[i] }}>
                {` ${valueF(values[t])} `}
              </span>
            </span>
          );
        })}
      </h2>

      <div style={{ height: boolean ? "200px" : `${topics.length * 30 + 300}px` }}>
        <Graph /*className="w-full max-w-full"*/ topics={topics} boolean={boolean} />
      </div>
    </div>
  );
};
