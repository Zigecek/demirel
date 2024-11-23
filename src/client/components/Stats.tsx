import React, { useEffect, useState } from "react";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";
import { FaListOl } from "react-icons/fa";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { MdSpeed, MdTrendingUp, MdTrendingDown } from "react-icons/md";
import { getDayDates } from "../../globals/daily";
import { useToday } from "../utils/todayHook";
import { postMqttStats } from "../proxy/endpoints";
import { format, addMinutes } from "date-fns";

const formatDayDate = (date: Date): string => {
  const { start: startToday, end: endToday } = getDayDates(new Date());
  const { start, end } = getDayDates(date);
  if (start >= startToday && end <= endToday) return "Dnes";

  const { start: startYesterday, end: endYesterday } = getDayDates(new Date(new Date().setDate(new Date().getDate() - 1)));
  if (start >= startYesterday && end <= endYesterday) return "Včera";

  const { start: startYesterday2, end: endYesterday2 } = getDayDates(new Date(new Date().setDate(new Date().getDate() - 2)));
  if (start >= startYesterday2 && end <= endYesterday2) return "Předvčírem";

  return format(date, "dd.MM.");
};

function formatTime(date: Date) {
  return format(addMinutes(date, date.getTimezoneOffset()), "HH:mm:ss");
}

type DayHistoryProps = {
  stats: dailyStats;
  valueF?: (msg: string) => string;
};

const DayHistory: React.FC<DayHistoryProps> = ({ stats, valueF }) => {
  const isBooleanStats = stats.uptime !== null || stats.downtime !== null;

  return (
    <div className="p-3 border rounded-lg bg-white shadow-md flex flex-col h-full flex-grow min-w-max flex-shrink-0">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{formatDayDate(stats.date)}</h3>
      {isBooleanStats ? (
        <div className="space-y-4">
          <div className="flex gap-2 whitespace-nowrap">
            <FaArrowUp className="text-green-500" />
            <span className="text-gray-500">Uptime:</span>
            <span className="font-medium">{formatTime(new Date(stats.uptime as number))}</span>
          </div>
          <div className="flex gap-2 whitespace-nowrap">
            <FaArrowDown className="text-red-500" />
            <span className="text-gray-500">Downtime:</span>
            <span className="font-medium">{formatTime(new Date(stats.downtime as number))}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <MdTrendingDown className="text-blue-500" />
            <span className="text-gray-500">Min:</span>
            <span className="font-medium">{valueF ? valueF(String(stats.min)) : stats.min}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MdTrendingUp className="text-red-500" />
            <span className="text-gray-500">Max:</span>
            <span className="font-medium">{valueF ? valueF(String(stats.max)) : stats.max}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MdSpeed className="text-yellow-500" />
            <span className="text-gray-500">Avg:</span>
            <span className="font-medium">{valueF ? valueF(String(stats.avg)) : stats.avg}</span>
          </div>
          <div className="flex items-center space-x-2">
            <FaListOl className="text-purple-500" />
            <span className="text-gray-500">Počet:</span>
            <span className="font-medium">{stats.count}</span>
          </div>
        </div>
      )}
    </div>
  );
};

type DailyHistoryProps = {
  topic: string;
  valueF?: (msg: string) => string;
};

export const DailyHistory: React.FC<DailyHistoryProps> = ({ topic, valueF }) => {
  const { stats: todayStats } = useToday({ topic });
  const [fetched, setFetched] = useState<dailyStats[]>();
  const [history, setHistory] = useState<dailyStats[]>([]);

  const [showAll, setShowAll] = useState(false);

  const toggleVisibility = () => {
    setShowAll(!showAll);
  };

  useEffect(() => {
    getStats();
  }, []);

  useEffect(() => {
    if (!todayStats) return;
    setHistory([todayStats, ...(fetched || [])]);
  }, [todayStats]);

  useEffect(() => {
    if (!fetched) return;
    if (todayStats) {
      setHistory([todayStats, ...fetched]);
    } else {
      setHistory(fetched);
    }
  }, [fetched]);

  const getStats = async () => {
    postMqttStats({ topic }).then((res) => {
      if (res.success) {
        setFetched(res.responseObject);
      }
    });
  };

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 m-1">
      <div className="flex items-center mb-2 gap-2">
        <h2 className="text-xl">
          <span className="font-semibold">Historie: </span>
          {topic}
        </h2>
        <button className="text-gray-600 hover:text-gray-900 focus:outline-none" onClick={toggleVisibility}>
          {showAll ? (
            <>
              <FaChevronUp />
            </>
          ) : (
            <>
              <FaChevronDown />
            </>
          )}
        </button>
      </div>
      {showAll && (
        <div className="overflow-x-auto flex m-2">
          <div className="flex gap-3 m-1">
            {history.map((stat, index) => (
              <DayHistory key={index} stats={stat} valueF={valueF} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
