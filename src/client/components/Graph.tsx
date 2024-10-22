import React, { useEffect, useState, useRef } from "react";
import "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { format } from "date-fns";
import "chartjs-adapter-date-fns";

type GraphProps = {
  dataPoints: { value: number; timestamp: number }[];
};

export const Graph: React.FC<GraphProps> = ({ dataPoints }) => {
  const [data, setData] = useState<any>({});
  const [options, setOptions] = useState<any>({});

  useEffect(() => {

    setData({
      datasets: [
        {
          label: "",
          data: dataPoints ? dataPoints.map((dp) => ({ x: dp.timestamp, y: dp.value })) : [],
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
      ],
    });

    setOptions({
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

  return <div>{dataPoints.length > 0 && <Line data={data} options={options} />}</div>;
};
