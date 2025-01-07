import React from "react";
import { useNicknames } from "../../contexts/NicknamesContext";
import { useTopic } from "../../hooks/useTopic";
import WindGauge from "./elementary/WindGauge";

type WindProps = {
  topic: string;
  valueF: (msg: any) => string;
  className?: string;
};

export const Wind: React.FC<WindProps> = ({ topic, valueF, className = "" }) => {
  const { value } = useTopic(topic);
  const { nickname } = useNicknames();

  return (
    <div
      className={`flex flex-col justify-center box-border max-h-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-md p-2 m-1 min-w-40 ${className}`}>
      <h2 className="text-xl mb-2 flex flex-wrap whitespace-pre z-0">
        <span>{nickname(topic)} </span>
      </h2>

      <div className="flex flex-row justify-center items-stretch h-full w-full">
        {typeof value === "number" && <WindGauge className="min-w-[330px] min-h-[330px]" direction={value} valueF={valueF} />}
      </div>
    </div>
  );
};

export default Wind;
