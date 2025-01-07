import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import "chart.js/auto";
import "chartjs-adapter-date-fns";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import { eachDayOfInterval, startOfDay } from "date-fns";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDark } from "../../../contexts/DarkContext";
import { useMessages } from "../../../contexts/MessagesContext";
import { useNicknames } from "../../../contexts/NicknamesContext";
import { useUser } from "../../../contexts/UserContext";
import { useTopics } from "../../../hooks/useTopics";
import { colors, suspiciousColor } from "../../../main";
import { postMqttData } from "../../../proxy/endpoints";

ChartJS.register(zoomPlugin, annotationPlugin, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const defaultBound = 1.5 * 24 * 60 * 60 * 1000;

type GraphProps = {
  topics: string[];
  style?: React.CSSProperties;
  boolean?: boolean;
  className?: string;
};

type Bounds = { min: number; max: number; minDefined: boolean; maxDefined: boolean };

export const Graph: React.FC<GraphProps> = ({ topics, style, boolean = false, className = "" }) => {
  // GLOBAL STATES //
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  const { addToHistory } = useMessages();
  const { nickname } = useNicknames();
  const { user, chartLock } = useUser();
  const { dark } = useDark();

  // Bounds for data fetching and timeout for debouncing
  const [bounds, setBounds] = useState<Bounds>();
  const [boundsTimeout, setBoundsTimeout] = useState<NodeJS.Timeout | null>(null);

  // User interaction state and timeout for resetting zoom
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Chart.js data and options
  const [data, setData] = useState<any>();
  const [options, setOptions] = useState<any>();

  // timestamp interval for data fetching in milliseconds
  const [loaded, setLoaded] = useState({ min: Number.MAX_SAFE_INTEGER, max: 0 });

  // time unit
  const [timeUnit, setTimeUnit] = useState("day");

  // TOPIC STATES //
  const { values, timestamps, suspicious } = useTopics(topics);
  const [dataPoints, setDataPoints] = useState<Record<string, { value: number; timestamp: Date }[]>>({});

  useEffect(() => {
    topics.forEach((topic) => {
      if (values[topic] != undefined && timestamps[topic]) {
        setDataPoints((prevData) => {
          const newData = { ...prevData };
          newData[topic] = [...(newData[topic] || []), { value: values[topic] as number, timestamp: timestamps[topic] }]
            // remove duplicates
            .filter((value, index, self) => self.findIndex((v) => v.timestamp.getTime() === value.timestamp.getTime()) === index)
            // sort by timestamp
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          return newData;
        });
      }
    });
  }, [values, timestamps]);

  const processAndSetDataPoints = (responseObject: MQTTMessageTransfer[], topic: string) => {
    setDataPoints((prevData) => {
      const newData = { ...prevData };
      newData[topic] = [
        ...(newData[topic] || []),
        ...responseObject.map((msg) => ({
          value: msg.value as number,
          timestamp: new Date(msg.timestamp),
        })),
      ]
        // remove duplicates
        .filter((value, index, self) => self.findIndex((v) => v.timestamp.getTime() === value.timestamp.getTime()) === index)
        // sort by timestamp
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return newData;
    });

    addToHistory(responseObject.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) } as MQTTMessage)));
  };

  const setTimeUnitByBounds = (min: number, max: number) => {
    const days = (max - min) / (24 * 60 * 60 * 1000);
    const hours = (max - min) / (60 * 60 * 1000);
    const minutes = (max - min) / (60 * 1000);

    if (days > 4) {
      setTimeUnit("day");
    } else if (hours > 2.5) {
      setTimeUnit("hour");
    } else if (minutes > 2.5) {
      setTimeUnit("minute");
    } else {
      setTimeUnit("second");
    }
  };

  useEffect(() => {
    if (boundsTimeout) clearTimeout(boundsTimeout);

    if (bounds) {
      setTimeUnitByBounds(bounds.min, bounds.max);
    }

    if (!user) return;

    const timeout = setTimeout(() => {
      if (!bounds) return;
      if (bounds.min >= loaded.min && bounds.max <= loaded.max) return;

      // get needed interval of timestamps for data fetching
      const postMin: number = bounds.min < loaded.min ? bounds.min : loaded.max;
      const postMax: number = bounds.max > loaded.max ? bounds.max : loaded.min;

      // get newest data point from data points
      const newestDataPoint = Math.max(
        ...Object.values(dataPoints)
          .flat()
          .map((dp) => dp.timestamp.getTime())
      );

      if (postMax > newestDataPoint) {
        setLoaded((prev) => ({ ...prev, max: Number.MAX_SAFE_INTEGER }));
      }

      // if the new interval contains the old one, post the difference (two intervals)
      if (postMin < loaded.min && postMax > loaded.max && loaded.min < loaded.max) {
        topics.forEach((topic) => {
          postMqttData({
            start: postMin,
            end: loaded.min,
            topic,
            boolean,
          }).then((res) => {
            if (res.success) {
              setLoaded((prev) => ({ min: postMin, max: prev.max }));
              processAndSetDataPoints(res.responseObject, topic);
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
              processAndSetDataPoints(res.responseObject, topic);
            }
          });
        });
      } else {
        topics.forEach((topic) => {
          postMqttData({
            start: postMin,
            end: postMax,
            topic,
            boolean,
          }).then((res) => {
            if (res.success) {
              // union loaded interval with new interval
              setLoaded((prev) => ({ min: Math.min(prev.min, postMin), max: Math.max(prev.max, postMax) }));
              processAndSetDataPoints(res.responseObject, topic);
            }
          });
        });
      }
    }, 100);

    setBoundsTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [bounds, user]);

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

    const maxTimestamp = Date.now();
    const width = canvasRef.current?.style.width;
    const screenWidth = window.innerWidth;
    const defaultView = maxTimestamp - defaultBound * (parseInt(width || "1") / screenWidth);

    const minX = bounds?.minDefined ? bounds.min : defaultView;
    const maxX = bounds?.maxDefined ? bounds.max : maxTimestamp;

    const midnightAnnotations = generateMidnightAnnotations(minX, maxX);

    const datasets = topics.map((topic) => ({
      label: nickname(topic),
      data: dataPoints[topic] ? dataPoints[topic].map((dp) => ({ x: dp.timestamp.getTime(), y: dp.value })) : [],
      borderColor: suspicious[topic] ? suspiciousColor : colors[topics.indexOf(topic) % colors.length],
      borderWidth: 2,
      fill: false,
      pointRadius: 1,
      animation: true,
    }));

    setData({
      datasets,
    });

    const min = Math.min(
      ...Object.values(dataPoints)
        .flat()
        .map((dp) => dp.value)
    );

    const max = Math.max(
      ...Object.values(dataPoints)
        .flat()
        .map((dp) => dp.value)
    );

    const dif = (max - min) * 0.1;

    setOptions({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          grid: {
            color: dark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)", // Barva mřížky osy X
          },
          ticks: {
            color: dark ? "#ffffff" : "#000000", // Barva popisků osy X
          },
          min: min - dif,
          max: max + dif,
        },
        x: {
          grid: {
            color: dark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)", // Barva mřížky osy X
          },
          ticks: {
            color: dark ? "#ffffff" : "#000000", // Barva popisků osy X
          },
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
        intersect: false,
      },
      plugins: {
        tooltip: {
          enabled: chartLock,
          bodyColor: dark ? "#ffffff" : "#000000", // Barva tooltip textu
          backgroundColor: dark ? "#000000" : "#ffffff", // Tooltip pozadí
        },
        legend: {
          display: topics.length > 1,
          labels: {
            color: dark ? "#ffffff" : "#000000", // Barva textu legendy
          },
        },
        zoom: {
          pan: {
            enabled: chartLock,
            mode: "x",
            onPan: ({ chart }: { chart: ChartJS }) => {
              onZoomPan(chart);
            },
          },
          zoom: {
            wheel: {
              enabled: chartLock,
            },
            pinch: {
              enabled: chartLock,
            },
            mode: "x",
            onZoom: ({ chart }: { chart: ChartJS }) => {
              onZoomPan(chart);
            },
          },
        },
        annotation: {
          annotations: midnightAnnotations,
        },
      },
    });
  }, [dataPoints, isUserInteracting, timeUnit, suspicious, user, chartLock, dark]);

  // native chart.js creation useEffect
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        chartInstanceRef.current = new ChartJS(ctx, {
          type: "line",
          data: data,
          options: options,
        });
      }
    }

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, [data, options]);

  useEffect(() => {
    if (!dataPoints) return;
    if (isUserInteracting) return;

    resetZoom();
  }, [isUserInteracting, dataPoints, user]);

  const onZoomPan = (chart: ChartJS) => {
    setBounds(chart.scales.x.getUserBounds());
    setIsUserInteracting(true);
  };

  useEffect(() => {
    if (bounds == undefined) {
      const maxTimestamp = Date.now();
      const width = canvasRef.current?.style.width;
      const screenWidth = window.innerWidth;
      const defaultView = maxTimestamp - defaultBound * (parseInt(width || "1") / screenWidth);
      setBounds({
        min: defaultView,
        max: maxTimestamp,
        minDefined: true,
        maxDefined: true,
      });
    }
  }, []);

  const updateChart = () => {
    if (chartInstanceRef.current) {
      const chart = chartInstanceRef.current;
      if (!isUserInteracting) {
        resetZoom();
      }
      chart.update(); // Trigger an update on the chart instance
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
    return () => {
      window.removeEventListener("resize", updateChart);
    };
  }, []);

  const resetZoom = () => {
    if (Object.values(dataPoints).flat().length > 0) {
      // get timestamp from last value of all topics
      const maxTimestamp = Math.max(
        ...Object.values(dataPoints)
          .flat()
          .map((dp) => dp.timestamp.getTime())
      );

      const width = canvasRef.current?.style.width;
      // get device display width, not window width (window.innerWidth;)
      const screenWidth = window.innerWidth;
      const defaultView = maxTimestamp - defaultBound * (parseInt(width || "1") / screenWidth);
      setBounds({
        min: defaultView,
        max: maxTimestamp,
        minDefined: true,
        maxDefined: true,
      });
      setTimeUnitByBounds(defaultView, maxTimestamp);
      setIsUserInteracting(false);
    }
  };

  // Add right-click event listener for resetting zoom
  useEffect(() => {
    const canvas = canvasRef.current;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (chartInstanceRef.current) {
        // Reset zoom using the Chart.js plugin API
        chartInstanceRef.current.resetZoom();
      }
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

  return <>{options != undefined && data != undefined && <canvas className={`${className}`} ref={canvasRef} style={{ ...style, width: "100%", height: "100%" }}></canvas>}</>;
};
