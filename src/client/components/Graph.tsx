import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation"; // Import annotation plugin
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "chartjs-adapter-date-fns";
import { useTopicValue } from "../utils/topicHook";
import { Chart as ChartJS } from "chart.js";
import { eachDayOfInterval, startOfDay } from "date-fns";

ChartJS.register(zoomPlugin, annotationPlugin);

type GraphProps = {
  topic: string;
  style?: React.CSSProperties;
};

type Bounds = { min: number; max: number; minDefined: boolean; maxDefined: boolean };

export const Graph: React.FC<GraphProps> = ({ topic, style }) => {
  const chartRef = useRef<any>(null);

  const { value, timestamp, suspicious, lastMsgs } = useTopicValue(topic);
  const [dataPoints, setDataPoints] = useState<{ value: number; timestamp: Date }[]>([]);

  const [bounds, setBounds] = useState<Bounds>();
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [resetTimeout, setResetTimeout] = useState<NodeJS.Timeout | null>(null);

  const [data, setData] = useState<any>({});
  const [options, setOptions] = useState<any>({});

  // only used when more than one message is received at once
  useEffect(() => {
    if (lastMsgs.length) {
      const msgs = lastMsgs.map((msg) => ({ value: msg.value as number, timestamp: msg.timestamp }));
      setDataPoints((prevData) => [...prevData, ...msgs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    }
  }, [lastMsgs]);

  useEffect(() => {
    if (value && timestamp) {
      setDataPoints((prevData) => {
        return [
          ...prevData,
          { value: value as number, timestamp: timestamp },
        ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
    }
  }, [value, timestamp]);

  // updating zoom on dataPoints change
  useEffect(() => {
    if (dataPoints.length > 0) {
      
      //const minTimestamp = Math.min(...dataPoints.map((dp) => dp.timestamp.getTime()));
      const maxTimestamp = Math.max(...dataPoints.map((dp) => dp.timestamp.getTime()));

      if (!bounds || !bounds.minDefined || !bounds.maxDefined) {
        const twoDaysAgo = maxTimestamp - 2 * 24 * 60 * 60 * 1000;
        setBounds({
          min: bounds?.minDefined ? bounds.min : twoDaysAgo,
          max: bounds?.maxDefined ? bounds.max : maxTimestamp,
          minDefined: true,
          maxDefined: true,
        });
      }

      if (!isUserInteracting) {
        setBounds((prev) => ({
          min: Math.max(maxTimestamp - 2 * 24 * 60 * 60 * 1000, prev?.min || 0),
          max: maxTimestamp,
          minDefined: true,
          maxDefined: true,
        }));
      }
    }
  }, [dataPoints]);

  // main datapoints useEffect
  useEffect(() => {
    const generateMidnightAnnotations = (minX: number, maxX: number) => {
      const midnightAnnotations: any[] = [];
      const start = startOfDay(new Date(minX));
      const end = startOfDay(new Date(maxX));
      const midnights = eachDayOfInterval({ start, end });
      midnightAnnotations.push(
        ...midnights.map((date) => ({
          type: "line",
          mode: "vertical",
          scaleID: "x",
          value: date.getTime(),
          borderColor: "rgba(255, 0, 0, 0.8)",
          borderWidth: 1,
          label: {
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            content: "Půlnoc",
            enabled: true,
            position: "top",
          },
        }))
      );

      return midnightAnnotations;
    };

    //const minTimestamp = Math.min(...dataPoints.map((dp) => dp.timestamp.getTime()));
    const maxTimestamp = Math.max(...dataPoints.map((dp) => dp.timestamp.getTime()));

    const twoDaysAgo = maxTimestamp - 2 * 24 * 60 * 60 * 1000;

    const minX = bounds?.minDefined ? bounds.min : twoDaysAgo;
    const maxX = bounds?.maxDefined ? bounds.max : maxTimestamp;

    const midnightAnnotations = generateMidnightAnnotations(minX, maxX);

    setData({
      datasets: [
        {
          label: "",
          data: dataPoints ? [...new Set(dataPoints)].map((dp) => ({ x: dp.timestamp.getTime(), y: dp.value })) : [],
          borderColor: suspicious ? "rgba(220, 75, 75, 1)" : "rgba(75, 220, 170, 1)",
          borderWidth: 2,
          fill: false,
          pointRadius: 1,
          animation: true,
        },
      ],
    });

    setOptions({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          min: dataPoints ? Math.min(...dataPoints.map((dp) => dp.value)) * 0.9 : 0,
          max: dataPoints ? Math.max(...dataPoints.map((dp) => dp.value)) * 1.1 : 100,
        },
        x: {
          type: "time",
          min: minX,
          max: maxX,
          time: {
            unit: "hour",
            tooltipFormat: "dd-LL-yyyy HH:mm:ss",
            displayFormats: {
              hour: "HH:mm",
            },
          },
        },
      },
      interaction: {
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
            onPan: ({ chart }: { chart: ChartJS }) => {
              setBounds(chart.scales.x.getUserBounds());
              setIsUserInteracting(true);
              resetActivityTimeout();
            },
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "x",
            onZoom: ({ chart }: { chart: ChartJS }) => {
              setBounds(chart.scales.x.getUserBounds());
              setIsUserInteracting(true);
              resetActivityTimeout();
            },
          },
        },
        annotation: {
          annotations: midnightAnnotations,
        },
      },
    });
  }, [dataPoints, isUserInteracting]);

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

  const resetActivityTimeout = () => {
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }
    // Set a new timeout to reset zoom after 1 minute of inactivity
    const timeout = setTimeout(resetZoom, 60 * 1000);
    setResetTimeout(timeout);
  };

  const resetZoom = () => {
    if (dataPoints.length > 0) {
      const maxTimestamp = Math.max(...dataPoints.map((dp) => dp.timestamp.getTime()));
      const twoDaysAgo = maxTimestamp - 2 * 24 * 60 * 60 * 1000;
      setBounds({
        min: twoDaysAgo,
        max: maxTimestamp,
        minDefined: true,
        maxDefined: true,
      });
      setIsUserInteracting(false);
    }
  };

  // Add right-click event listener for resetting zoom
  useEffect(() => {
    const canvas = chartRef.current?.canvas?.parentNode;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      resetZoom();
    };

    if (canvas) {
      canvas.addEventListener("contextmenu", handleContextMenu);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("contextmenu", handleContextMenu);
      }
    };
  }, [dataPoints]);

  return <div>{dataPoints.length > 0 && <Line style={style} ref={chartRef} data={data} options={options} />}</div>;
};
