import { useEffect, useState } from "react";
import { calculateStats, getDayDates } from "../../globals/daily";
import { useMessages } from "../contexts/MessagesContext";

type UseTodayProps = {
  topic: string;
};

export const useToday = ({ topic }: UseTodayProps) => {
  const { history } = useMessages();
  const [stats, setStats] = useState<dailyStats>();

  useEffect(() => {
    if (!history) return;
    if (!topic) return;
    if (!history[topic]) return;

    const { start, end } = getDayDates(new Date());
    const todayMsgs = history[topic].filter((msg) => msg.timestamp > start && msg.timestamp < end);
    if (todayMsgs.length == 0) return;

    const calcs = calculateStats(todayMsgs, start, end);

    if (stats) {
      if (JSON.stringify(stats) !== JSON.stringify(calcs)) {
        setStats(calcs);
      }
    } else {
      setStats(calcs);
    }
  }, [history]);

  return { stats };
};
