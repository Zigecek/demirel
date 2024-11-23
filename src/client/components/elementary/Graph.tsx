// TODO: Remove duplicates from data fetching code

import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "chartjs-adapter-date-fns";
import { useTopic } from "../../utils/topicHook";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { eachDayOfInterval, startOfDay } from "date-fns";
import { postMqttData } from "../../proxy/endpoints";
import { useMessages } from "../../utils/MessagesContext";

ChartJS.register(zoomPlugin, annotationPlugin, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type GraphProps = {
  topic: string;
  style?: React.CSSProperties;
  boolean?: boolean;
};

type Bounds = { min: number; max: number; minDefined: boolean; maxDefined: boolean };

export const Graph: React.FC<GraphProps> = ({ topic, style, boolean = false }) => {
  const chartRef = useRef<any>(null);

  const { addToHistory } = useMessages();

  const { value, timestamp, suspicious } = useTopic(topic);
  const [dataPoints, setDataPoints] = useState<{ value: number; timestamp: Date }[]>([]);

  // Bounds for data fetching and timeout for debouncing
  const [bounds, setBounds] = useState<Bounds>();
  const [boundsTimeout, setBoundsTimeout] = useState<NodeJS.Timeout | null>(null);

  // User interaction state and timeout for resetting zoom
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [resetTimeout, setResetTimeout] = useState<NodeJS.Timeout | null>(null);

  // Chart.js data and options
  const [data, setData] = useState<any>();
  const [options, setOptions] = useState<any>();

  // timestamp interval for data fetching in milliseconds
  const [loaded, setLoaded] = useState({ min: Number.MAX_SAFE_INTEGER, max: 0 });

  // time unit
  const [timeUnit, setTimeUnit] = useState("day");

  useEffect(() => {
    if (value != undefined && timestamp) {
      setDataPoints((prevData) => {
        return (
          [...prevData, { value: value as number, timestamp }]
            // remove duplicates
            .filter((value, index, self) => self.findIndex((v) => v.timestamp.getTime() === value.timestamp.getTime()) === index)
            // sort by timestamp
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        );
      });
    }
  }, [value]);

  const processAndSetDataPoints = (responseObject: MQTTMessageTransfer[]) => {
    setDataPoints((prevData) => {
      return (
        [
          ...prevData,
          ...responseObject.map((msg) => ({
            value: msg.value as number,
            timestamp: new Date(msg.timestamp),
          })),
        ]
          // remove duplicates
          .filter((value, index, self) => self.findIndex((v) => v.timestamp.getTime() === value.timestamp.getTime()) === index)
          // sort by timestamp
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      );
    });

    addToHistory(responseObject.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) }) as MQTTMessage));
  };

  useEffect(() => {
    if (boundsTimeout) clearTimeout(boundsTimeout);

    if (bounds) {
      const days = (bounds.max - bounds.min) / (24 * 60 * 60 * 1000);
      const hours = (bounds.max - bounds.min) / (60 * 60 * 1000);
      const minutes = (bounds.max - bounds.min) / (60 * 1000);

      if (days > 4) {
        setTimeUnit("day");
      } else if (hours > 2.5) {
        setTimeUnit("hour");
      } else if (minutes > 2.5) {
        setTimeUnit("minute");
      } else {
        setTimeUnit("second");
      }
    }

    const timeout = setTimeout(() => {
      if (!bounds) return;
      if (bounds.min >= loaded.min && bounds.max <= loaded.max) return;

      // get needed interval of timestamps for data fetching
      const postMin: number = bounds.min < loaded.min ? bounds.min : loaded.max;
      const postMax: number = bounds.max > loaded.max ? bounds.max : loaded.min;

      // if the new interval contains the old one, post the difference (two intervals)
      if (postMin < loaded.min && postMax > loaded.max && loaded.min < loaded.max) {
        postMqttData({
          start: postMin,
          end: loaded.min,
          topic,
          boolean,
        }).then((res) => {
          if (res.success) {
            setLoaded((prev) => ({ min: postMin, max: prev.max }));
            processAndSetDataPoints(res.responseObject);
          }
        });

        postMqttData({
          start: loaded.max,
          end: postMax,
          topic,
          boolean,
        }).then((res) => {
          if (res.success) {
            setLoaded((prev) => ({ min: prev.min, max: postMax }));
            processAndSetDataPoints(res.responseObject);
          }
        });
      } else {
        postMqttData({
          start: postMin,
          end: postMax,
          topic,
          boolean,
        }).then((res) => {
          if (res.success) {
            // union loaded interval with new interval
            setLoaded((prev) => ({ min: Math.min(prev.min, postMin), max: Math.max(prev.max, postMax) }));
            processAndSetDataPoints(res.responseObject);
          }
        });
      }
    }, 100);

    setBoundsTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [bounds]);

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
          borderColor: "rgba(100, 100, 100, 0.8)",
          borderWidth: 2,
        }))
      );

      return midnightAnnotations;
    };

    //const minTimestamp = Math.min(...dataPoints.map((dp) => dp.timestamp.getTime()));
    const maxTimestamp = Date.now();
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
            unit: timeUnit,
            tooltipFormat: "dd-LL-yyyy HH:mm:ss",
            displayFormats: {
              day: "dd-LL-yyyy",
              hour: "HH:mm",
              minute: "HH:mm",
              second: "HH:mm:ss",
            },
          },
        },
      },
      interaction: {
        //mode: "nearest",
        //axis: "x",
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
  }, [dataPoints, isUserInteracting, timeUnit]);

  useEffect(() => {
    if (bounds == undefined) {
      const maxTimestamp = Date.now();
      const twoDaysAgo = maxTimestamp - 2 * 24 * 60 * 60 * 1000;
      setBounds({
        min: twoDaysAgo,
        max: maxTimestamp,
        minDefined: true,
        maxDefined: true,
      });
    }
  }, []);

  const updateChart = () => {
    if (chartRef.current && chartRef.current.canvas && chartRef.current.canvas.style) {
      chartRef.current.canvas.style.width = "100%";
    }
    if (chartRef.current) {
      chartRef.current.update();
    }
  };

  useEffect(() => {
    if (data != undefined && options != undefined) {
      updateChart();
    }
  }, [data, options]);

  useLayoutEffect(() => {
    updateChart();
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
      setTimeUnit("day");
      const maxTimestamp = Date.now();
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

  return <>{options != undefined && data != undefined && <Line style={style} ref={chartRef} data={data} options={options} />}</>;
};
