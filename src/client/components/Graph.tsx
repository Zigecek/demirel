import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation"; // Import annotation plugin
import { Chart, Line } from "react-chartjs-2";
import "chart.js/auto";
import "chartjs-adapter-date-fns";
import { format } from "date-fns"; // Import date-fns formatting
import { useTopicValue } from "../utils/topicHook";
import { Chart as ChartJS } from "chart.js";

ChartJS.register(zoomPlugin, annotationPlugin);

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
    const minTimestamp = Math.min(...dataPoints.map((dp) => dp.timestamp.getTime()));
    const maxTimestamp = Math.max(...dataPoints.map((dp) => dp.timestamp.getTime()));

    // Define unique midnights without mutating original timestamps
    const uniqueMidnights = Array.from(
      new Set(
        dataPoints.map((dp) => {
          const date = new Date(dp.timestamp); // Create a new Date instance to avoid mutation
          date.setHours(0, 0, 0, 0); // Set to midnight
          return date.getTime();
        })
      )
    );

    // Filter midnights to be within the min and max timestamps
    const midnightAnnotations = uniqueMidnights
      .filter((midnightTime) => midnightTime >= minTimestamp && midnightTime <= maxTimestamp)
      .map((midnightTime) => ({
        type: "line",
        mode: "vertical",
        scaleID: "x",
        value: midnightTime,
        borderColor: "rgba(0, 120, 70, 0.5)",
        borderWidth: 1,
        label: {
          display: false,
        },
      }));

    setData({
      datasets: [
        {
          label: "",
          data: dataPoints ? [...new Set(dataPoints)].map((dp) => ({ x: dp.timestamp.getTime(), y: dp.value })) : [],
          borderColor: suspicious ? "rgba(220, 75, 75, 1)" : "rgba(75, 220, 170, 1)",
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 1,
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
            unit: "hour",
            tooltipFormat: "dd-LL-yyyy HH:mm:ss", // Full date time format
            displayFormats: {
              hour: "HH:mm", // Display format in 24-hour format
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
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
        annotation: {
          annotations: midnightAnnotations,
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
