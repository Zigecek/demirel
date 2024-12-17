import React from "react";
import { useNicknames } from "../../contexts/NicknamesContext";
import { useTopic } from "../../hooks/useTopic";

type ValueProps = {
  topic: string;
  valueF: (msg: any) => string;
};

export const Value: React.FC<ValueProps> = ({ topic, valueF }) => {
  const { value, lastUpdated, suspicious } = useTopic(topic);
  const { nickname } = useNicknames();

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1 flex-1 min-w-40">
      <h2 className="text-xl mb-2 flex flex-wrap whitespace-pre">
        <span className="font-semibold">Nyní: </span>
        <span>{nickname(topic)}</span>
      </h2>
      <p className={`text-2xl font-bold ${suspicious ? "text-red-600 font-bold" : "text-blue-500"}`}>{valueF(value + "")}</p>

      {lastUpdated != undefined && (
        <p className="text-xs text-gray-500 mt-2">
          Před <span className={suspicious ? "text-red-600 font-bold" : "text-gray-500"}>{lastUpdated}</span> vteřinami
        </p>
      )}
    </div>
  );
};
