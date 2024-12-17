import { addMinutes, format } from "date-fns";
import React, { useEffect, useState } from "react";
import { FaArrowDown, FaArrowUp, FaChevronDown, FaChevronUp, FaListOl } from "react-icons/fa";
import { FaArrowsUpDown } from "react-icons/fa6";
import { MdSpeed, MdTrendingDown, MdTrendingUp } from "react-icons/md";
import { getDayDates } from "../../../globals/daily";
import { useNicknames } from "../../contexts/NicknamesContext";
import { useUser } from "../../contexts/UserContext";
import { useToday } from "../../hooks/useToday";
import { postMqttStats } from "../../proxy/endpoints";

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
  valueF?: (msg: any) => string;
};

const DayHistory: React.FC<DayHistoryProps> = ({ stats, valueF = (msg: any) => msg }) => {
  const isBooleanStats = stats.uptime !== null || stats.downtime !== null;

  return (
    <div className="p-3 border rounded-lg bg-white shadow-md flex flex-col h-full flex-grow min-w-max flex-shrink-0">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{formatDayDate(stats.date)}</h3>
      {isBooleanStats ? (
        <div className="space-y-4">
          <div className="flex gap-2 whitespace-nowrap">
            <FaArrowsUpDown className="text-orange-200" />
            <span className="text-gray-500">Počet:</span>
            <span className="font-medium">{stats.risingCount}</span>
          </div>
          <div className="flex gap-2 whitespace-nowrap">
            <FaArrowUp className="text-green-500" />
            <span className="text-gray-500">1:</span>
            <span className="font-medium">{formatTime(new Date(Math.round((stats.uptime as number) / 1000) * 1000))}</span>
          </div>
          <div className="flex gap-2 whitespace-nowrap">
            <FaArrowDown className="text-red-500" />
            <span className="text-gray-500">0:</span>
            <span className="font-medium">{formatTime(new Date(Math.round((stats.downtime as number) / 1000) * 1000))}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <MdTrendingUp className="text-red-500" />
            <span className="text-gray-500">Max:</span>
            <span className="font-medium">{valueF(stats.max + "")}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MdTrendingDown className="text-blue-500" />
            <span className="text-gray-500">Min:</span>
            <span className="font-medium">{valueF(stats.min + "")}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MdSpeed className="text-yellow-500" />
            <span className="text-gray-500">Průměr:</span>
            <span className="font-medium">{valueF(stats.avg + "")}</span>
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
  valueF?: (msg: any) => string;
  hidden?: boolean;
};

export const DailyHistory: React.FC<DailyHistoryProps> = ({ topic, valueF = (msg: any) => msg, hidden = true }) => {
  const { stats: todayStats } = useToday({ topic });
  const { nickname } = useNicknames();
  const [fetched, setFetched] = useState<dailyStats[]>();
  const [history, setHistory] = useState<dailyStats[]>([]);
  const { user } = useUser();

  const [showAll, setShowAll] = useState(!hidden);

  const toggleVisibility = () => {
    setShowAll(!showAll);
  };

  useEffect(() => {
    if (!user) return;
    getStats();
  }, [user]);

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
          {nickname(topic)}
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
