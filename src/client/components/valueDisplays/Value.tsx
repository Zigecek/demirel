import React from "react";
import { useNicknames } from "../../contexts/NicknamesContext";
import { useTopic } from "../../hooks/useTopic";
import { colors, suspiciousColor } from "../../main";
import Dot from "./elementary/Dot";

type ValueProps = {
  topic: string;
  valueF: (msg: any) => string;
};

export const Value: React.FC<ValueProps> = ({ topic, valueF }) => {
  const { value, suspicious, animationDuration, lastMessageInterval } = useTopic(topic);
  const { nickname } = useNicknames();

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-md p-2 m-1 flex-1 min-w-40">
      <h2 className="text-xl mb-2 flex flex-wrap whitespace-pre z-0">
        <span>{nickname(topic)} </span>
      </h2>
      <p className="text-2xl font-bold" style={{ color: suspicious ? suspiciousColor : colors[0] }}>
        <Dot duration={animationDuration!} interval={lastMessageInterval!} />
        {valueF(value + "")}
      </p>
    </div>
  );
};

export default Value;
