import { useEffect, useState } from "react";
import { useWebSocket } from "./WebSocketContext";
import _ from "lodash";

export const useTopicValue = (topic: string) => {
  const { messages } = useWebSocket();
  const [value, setValue] = useState<MQTTMessageNew["value"]>("");
  const [lastMsgs, setLastMsgs] = useState<Omit<MQTTMessageNew, "topic">[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>();
  const [timestamp, setTimestamp] = useState<Date>();
  const [suspicious, setSuspicious] = useState<boolean>(false);
  const [lastMessageInterval, setLastMessageInterval] = useState<number | undefined>(undefined);

  const updateLastUpdated = () => {
    if (timestamp) {
      const now = new Date();
      const timeSinceLastMessage = (now.getTime() - timestamp.getTime()) / 1000;
      setLastUpdated(Math.round(timeSinceLastMessage));

      if (lastMessageInterval) {
        const allowedInterval = lastMessageInterval * 1.5;
        setSuspicious(now.getTime() - timestamp.getTime() > allowedInterval);
        return;
      }

      const hardLimit = 2 * 60 * 1000;
      if (now.getTime() - timestamp.getTime() > hardLimit) {
        setSuspicious(true);
        return;
      }

      setSuspicious(false);
    }
  };

  useEffect(() => {
    if (!messages) return;
    if (!topic) return;
    if (messages.length == 0) return;
    const clonnedMessages = _.cloneDeep(messages);

    // get messages for the topic
    const topicMsgs = clonnedMessages.filter((msg) => msg.topic == topic);
    if (!topicMsgs) return;
    if (topicMsgs.length == 0) return;

    const msg = topicMsgs.pop();
    if (!msg) return;

    if (timestamp) {
      const interval = msg.timestamp.getTime() - timestamp.getTime();
      setLastMessageInterval(interval);
    }

    if (topic == "zige/pozar0/cerpadlo/val") console.log("update");

    if (topicMsgs.length > 0) setLastMsgs(topicMsgs);
    setValue(msg.value);
    setTimestamp(msg.timestamp);
  }, [messages, topic]);

  useEffect(() => {
    if (timestamp) {
      const interval = setInterval(updateLastUpdated, 1000);
      updateLastUpdated();

      return () => {
        clearInterval(interval);
      };
    }
  }, [timestamp]);

  return { value, lastUpdated, timestamp, suspicious, lastMsgs };
};
