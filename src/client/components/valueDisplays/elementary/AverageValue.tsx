import React from "react";
import { useNicknames } from "../../../contexts/NicknamesContext";
import { useTopics } from "../../../hooks/useTopics";
import { colors, suspiciousColor } from "../../../main";
import Dot from "./Dot";

type AverageValueProps = {
  topics: string[];
  valueF: (msg: any) => string;
};

export const AverageValue: React.FC<AverageValueProps> = ({ topics, valueF }) => {
  const { values, suspicious, lastMessageIntervals, animationDurations } = useTopics(topics);
  const { nickname } = useNicknames();

  const average = (arr: any[]) => {
    const sum = arr.reduce((acc, val) => +acc + +val, 0);
    return +sum / arr.length;
  };

  return (
    <div className="group relative">
      <p className={`text-xl font-semibold`} style={{ color: Object.values(suspicious).some((x) => x) ? suspiciousColor : colors[0] }}>
        <Dot duration={Math.round(average(Object.values(animationDurations)))} interval={Math.round(average(Object.values(lastMessageIntervals)))} />
        {valueF(average(Object.values(values)) + "")}
      </p>
      <div className="group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none bg-neutral-100 dark:bg-neutral-900 border-2 border-neutral-400 dark:border-neutral-600 dark:text-white rounded-md absolute opacity-0 min-w-max right-0 shadow-lg dark:shadow-neutral-800">
        {topics.map((topic, i) => (
          <p key={i} className="p-2">
            <Dot duration={animationDurations[topic]!} interval={lastMessageIntervals[topic]!} />
            {nickname(topic)}: <span style={{ color: suspicious[topic] ? suspiciousColor : colors[i] }}>{valueF(values[topic])}</span>
          </p>
        ))}
      </div>
    </div>
  );
};
