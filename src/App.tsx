import { useState, useEffect, useContext } from "react";
import { socket } from "./ws-client";

import { Value } from "./components/Value";

export default function App() {
  const [messages, setMessages] = useState<MQTTMessage[]>([]);

  socket.on("messages", (msgs: MQTTMessage[]) => {
    setMessages([...msgs, ...messages]);
  });

  return (
    <>
      <div className="flex flex-wrap justify-start">
        <Value topic="zige/pozar1/temp/val"/>
        <Value topic="zige/pozar1/12v/val"/>
      </div>
    </>
  );
}
