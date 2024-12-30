import _ from "lodash";
import { useEffect, useState } from "react";
import { useMessages } from "../contexts/MessagesContext";

export const useTopic = (topic: string) => {
  const { messages, addToHistory } = useMessages();
  const [value, setValue] = useState<MQTTMessage["value"]>();
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
        const allowedInterval = lastMessageInterval * 2;
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

    addToHistory([msg]);

    if (timestamp) {
      if (msg.timestamp.getTime() <= timestamp.getTime()) return;

      const interval = msg.timestamp.getTime() - timestamp.getTime();
      setLastMessageInterval(interval);
    }

    setValue(msg.value);
    setTimestamp(msg.timestamp);
  }, [messages, topic]);

  useEffect(() => {
    if (timestamp) {
      const interval = setInterval(updateLastUpdated, 500);
      updateLastUpdated();

      return () => {
        clearInterval(interval);
      };
    }
  }, [timestamp]);

  return { value, lastUpdated, timestamp, suspicious, lastMessageInterval };
};
