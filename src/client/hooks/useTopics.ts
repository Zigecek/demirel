import _ from "lodash";
import { useEffect, useState } from "react";
import { useMessages } from "../contexts/MessagesContext";

export const useTopics = (topics: string[]) => {
  const { messages, addToHistory } = useMessages();
  const [values, setValues] = useState<Record<string, MQTTMessage["value"]>>({});
  const [lastUpdated, setLastUpdated] = useState<Record<string, number>>({});
  const [timestamps, setTimestamps] = useState<Record<string, Date>>({});
  const [suspicious, setSuspicious] = useState<Record<string, boolean>>({});
  const [lastMessageIntervals, setLastMessageIntervals] = useState<Record<string, number | undefined>>({});

  const updateLastUpdated = (topic: string) => {
    const timestamp = timestamps[topic];
    if (timestamp) {
      const now = new Date();
      const timeSinceLastMessage = (now.getTime() - timestamp.getTime()) / 1000;
      setLastUpdated((prev) => ({ ...prev, [topic]: Math.round(timeSinceLastMessage) }));

      const lastMessageInterval = lastMessageIntervals[topic];
      if (lastMessageInterval) {
        const allowedInterval = lastMessageInterval * 1.3;
        if (suspicious[topic] !== now.getTime() - timestamp.getTime() > allowedInterval) {
          setSuspicious((prev) => ({ ...prev, [topic]: now.getTime() - timestamp.getTime() > allowedInterval }));
        }
        return;
      }

      const hardLimit = 2 * 60 * 1000;
      if (now.getTime() - timestamp.getTime() > hardLimit) {
        if (!suspicious[topic]) {
          setSuspicious((prev) => ({ ...prev, [topic]: true }));
        }
        return;
      }

      if (suspicious[topic]) {
        setSuspicious((prev) => ({ ...prev, [topic]: false }));
      }
    }
  };

  useEffect(() => {
    if (!messages) return;
    if (!topics || topics.length === 0) return;
    if (messages.length === 0) return;
    const clonnedMessages = _.cloneDeep(messages);

    const newValues: Record<string, MQTTMessage["value"]> = {};
    const newTimestamps: Record<string, Date> = {};
    const newLastMessageIntervals: Record<string, number | undefined> = {};
    const newMsgHistory: MQTTMessage[] = [];

    topics.forEach((topic) => {
      const topicMsgs = clonnedMessages.filter((msg) => msg.topic === topic);
      if (!topicMsgs || topicMsgs.length === 0) return;

      const msg = topicMsgs.pop();
      if (!msg) return;

      newMsgHistory.push(msg);

      const timestamp = timestamps[topic];
      if (timestamp) {
        if (msg.timestamp.getTime() <= timestamp.getTime()) return;

        const interval = msg.timestamp.getTime() - timestamp.getTime();
        newLastMessageIntervals[topic] = interval;
      }

      newValues[topic] = msg.value;
      newTimestamps[topic] = msg.timestamp;
    });

    addToHistory(newMsgHistory);
    setValues((prev) => ({ ...prev, ...newValues }));
    setTimestamps((prev) => ({ ...prev, ...newTimestamps }));
    setLastMessageIntervals((prev) => ({ ...prev, ...newLastMessageIntervals }));
  }, [messages, topics]);

  useEffect(() => {
    const intervals: Record<string, NodeJS.Timeout> = {};

    topics.forEach((topic) => {
      const timestamp = timestamps[topic];
      if (timestamp) {
        intervals[topic] = setInterval(() => updateLastUpdated(topic), 1000);
        updateLastUpdated(topic);
      }
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [timestamps, topics]);

  return { values, lastUpdated, timestamps, suspicious };
};
