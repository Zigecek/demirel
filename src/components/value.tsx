import React, { useState } from "react";
import { socketEE } from "../ws-client";

type ValueProps = {
  topic: string;
};

export const Value: React.FC<ValueProps> = ({ topic }) => {
  const [value, setValue] = useState<string>("");
  socketEE.on(topic, (msg: string) => {
    setValue(msg);
  });
  return (
    <div className="border border-gray-300 rounded-lg shadow-md p-4 m-2 w-56">
      <h2 className="text-xl font-semibold mb-2">{topic}</h2>
      <p className="text-2xl font-bold text-blue-500">{value}</p>
    </div>
  );
};
