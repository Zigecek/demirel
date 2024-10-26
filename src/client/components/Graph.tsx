import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "chartjs-adapter-date-fns";
import { useTopicValue } from "../utils/topicHook";

type GraphProps = {
  topic: string;
};

export const Graph: React.FC<GraphProps> = ({ topic }) => {
  const chartRef = useRef<any>(null);
  const { value, lastUpdated, timestamp, suspicious, lastMsgs } = useTopicValue(topic);
  const [dataPoints, setDataPoints] = useState<{ value: number; timestamp: Date }[]>([]);

  const [data, setData] = useState<any>({});
  const [options, setOptions] = useState<any>({});

  useEffect(() => {
    if (lastMsgs.length) {
      const msgs = lastMsgs.map((msg) => ({ value: msg.value as number, timestamp: msg.timestamp }));
      setDataPoints((prevData) => [...prevData, ...msgs]);
    }

    if (value && timestamp) {
      setDataPoints((prevData) => {
        return [
          ...prevData,
          { value: value as number, timestamp: timestamp }, // timestamp v ms pro graf
        ];
      });
    }
  }, [value, timestamp, lastMsgs]);

  useEffect(() => {
    setData({
      datasets: [
        {
          label: "",
          data: dataPoints ? [...new Set(dataPoints)].map((dp) => ({ x: dp.timestamp.getTime(), y: dp.value })) : [],
          borderColor: suspicious ? "rgba(220, 75, 75, 1)" : "rgba(75, 220, 170, 1)",
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    });

    setOptions({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: dataPoints ? Math.max(...dataPoints.map((dp) => dp.value)) * 1.1 : 100,
        },
        x: {
          type: "time",
          time: {
            unit: "day",
          },
        },
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "x",
          },
        },
        legend: {
          display: false,
        },
      },
    });
  }, [dataPoints]);

  const updateChart = () => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  };

  useLayoutEffect(() => {
    window.addEventListener("resize", updateChart);
    //const interval = setInterval(updateChart, 2000);
    return () => {
      window.removeEventListener("resize", updateChart);
      //clearInterval(interval);
    };
  }, []);

  return <div>{dataPoints.length > 0 && <Line ref={chartRef} data={data} options={options} />}</div>;
};
