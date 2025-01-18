import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, registerables, Title, Tooltip } from "chart.js";
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
ChartJS.register(...registerables);

const defaultBound = 1.5 * 24 * 60 * 60 * 1000;

type GraphProps = {
  topics: string[];
  hidden?: boolean[];
  style?: React.CSSProperties;
  boolean?: boolean;
  className?: string;
};

type Bounds = { min: number; max: number; minDefined: boolean; maxDefined: boolean };

export const Graph: React.FC<GraphProps> = ({ topics, style, boolean = false, className = "", hidden }) => {
  // GLOBAL STATES //
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  const { addToHistory } = useMessages();
  const { nickname } = useNicknames();
  const { user, chartLock } = useUser();
  const { dark } = useDark();

  // Bounds for data fetching and timeout for debouncing
  const [bounds, setBounds] = useState<Bounds>({
    min: Date.now() - defaultBound,
    max: Date.now(),
    minDefined: true,
    maxDefined: true,
  });
  const boundsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mouseUp, setMouseUp] = useState(true);

  // User interaction state and timeout for resetting zoom
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Chart.js data and options
  const [data, setData] = useState<any>();
  const [options, setOptions] = useState<any>();

  // timestamp interval for data fetching in milliseconds
  const [loaded, setLoaded] = useState({ min: Date.now(), max: Number.MAX_SAFE_INTEGER });
  const [loading, setLoading] = useState(false);

  // time unit
  const [timeUnit, setTimeUnit] = useState("day");

  // TOPIC STATES //
  const { values, timestamps, suspicious } = useTopics(topics);
  const [httpPoints, setHttpPoints] = useState<Record<string, { value: number; timestamp: Date }[]>>({});
  const [wsPoints, setWsPoints] = useState<Record<string, { value: number; timestamp: Date }[]>>({});
  const [shownPoints, setShownPoints] = useState<Record<string, { value: number; timestamp: Date }[]>>({});
  const [minMax, setMinMax] = useState<{ min: number; max: number }>({ min: Number.MAX_SAFE_INTEGER, max: 0 });

  // when values or timestamps change, add new data points
  useEffect(() => {
    topics.forEach((topic) => {
      if (values[topic] != undefined && timestamps[topic]) {
        setShownPoints((prevData) => {
          const newData = { ...prevData };
          newData[topic] = [...(newData[topic] || []), { value: values[topic] as number, timestamp: timestamps[topic] }];
          return newData;
        });
        setWsPoints((prevData) => {
          const newData = { ...prevData };
          newData[topic] = [...(newData[topic] || []), { value: values[topic] as number, timestamp: timestamps[topic] }];
          return newData;
        });
      }
    });
  }, [values, timestamps]);

  const processAndSetHttpPoints = (msgs: MQTTMessageTransfer[]) => {
    setHttpPoints((prevData) => {
      const newData = { ...mergePoints(prevData, wsPoints) };
      msgs.forEach((msg) => {
        const topic = msg.topic;
        if (!newData[topic]) {
          newData[topic] = [];
        }
        newData[topic].push({
          value: msg.value as number,
          timestamp: new Date(msg.timestamp),
        });
      });

      return newData;
    });

    addToHistory(msgs.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) } as MQTTMessage)));
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

  const handleDataFetch = (bounds: Bounds) => {
    if (!bounds || !user) return;

    if (bounds.min >= loaded.min && bounds.max <= loaded.max) return;

    const postMin = bounds.min < loaded.min ? bounds.min : loaded.max;
    const postMax = bounds.max > loaded.max ? bounds.max : loaded.min;

    if (postMin < loaded.min && postMax > loaded.max && loaded.min < loaded.max) {
      Promise.all([postMqttData({ start: postMin, end: loaded.min, topics, boolean }), postMqttData({ start: loaded.max, end: postMax, topics, boolean })]).then(([res1, res2]) => {
        if (res1.success) {
          setLoaded((prev) => ({ min: postMin, max: prev.max }));
        }
        if (res2.success) {
          setLoaded((prev) => ({ min: prev.min, max: postMax }));
        }
        processAndSetHttpPoints([...(res2.success ? res2.responseObject : []), ...(res1.success ? res1.responseObject : [])]);
      });
    } else {
      postMqttData({ start: postMin, end: postMax, topics, boolean }).then((res) => {
        if (res.success) {
          setLoaded((prev) => ({
            min: Math.min(prev.min, postMin),
            max: Math.max(prev.max, postMax),
          }));
          processAndSetHttpPoints(res.responseObject);
        }
      });
    }
  };

  // Effect for debounced bounds changes
  useEffect(() => {
    if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);

    if (bounds) {
      setTimeUnitByBounds(bounds.min, bounds.max);

      boundsTimeoutRef.current = setTimeout(() => {
        handleDataFetch(bounds);
      }, 300);
    }

    return () => {
      if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
    };
  }, [bounds, user]);

  // Effect for immediate mouseUp changes
  useEffect(() => {
    if (mouseUp && !chartLock) {
      handleDataFetch(bounds);
    }
  }, [mouseUp, user]);

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

    const minX = bounds?.minDefined ? bounds.min : Date.now() - defaultBound;
    const maxX = bounds?.maxDefined ? bounds.max : Date.now();

    const midnightAnnotations = generateMidnightAnnotations(minX, maxX);

    const datasets = topics.map((topic) => ({
      label: nickname(topic),
      data: shownPoints[topic] ? shownPoints[topic].map((dp) => ({ x: dp.timestamp.getTime(), y: dp.value })) : [],
      borderColor: suspicious[topic] ? suspiciousColor : colors[topics.indexOf(topic) % colors.length],
      borderWidth: 2,
      fill: false,
      pointRadius: 0.5,
      animation: true,
      hidden: hidden ? hidden[topics.indexOf(topic)] : false,
    }));

    setData({
      datasets,
    });

    const dif = (minMax.max - minMax.min) * 0.1;

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
          min: minMax.min - dif,
          max: minMax.max + dif,
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
          display: false,
          labels: {
            color: dark ? "#ffffff" : "#000000", // Barva textu legendy
          },
        },
        zoom: {
          pan: {
            enabled: chartLock && !loading,
            mode: "x",
            onPan: ({ chart }: { chart: ChartJS }) => {
              onZoomPan(chart);
            },
          },
          zoom: {
            wheel: {
              enabled: chartLock && !loading,
            },
            pinch: {
              enabled: chartLock && !loading,
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
  }, [shownPoints, isUserInteracting, timeUnit, suspicious, user, chartLock, dark, hidden]);

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

  const onZoomPan = (chart: ChartJS) => {
    setIsUserInteracting(true);
    setBounds(chart.scales.x.getUserBounds());
  };

  const updateChart = () => {
    if (chartInstanceRef.current) {
      const chart = chartInstanceRef.current;
      if (!isUserInteracting) {
        resetZoom();
      }
      chart.update(); // Trigger an update on the chart instance
    }
  };

  const mergePoints = (pointsA: Record<string, { value: number; timestamp: Date }[]>, pointsB: Record<string, { value: number; timestamp: Date }[]>) => {
    const mergedPoints: Record<string, { value: number; timestamp: Date }[]> = {};
    [...Object.keys(pointsA), ...Object.keys(pointsB)].forEach((topic) => {
      mergedPoints[topic] = [...(pointsA[topic] || []), ...(pointsB[topic] || [])];
    });
    return mergedPoints;
  };

  const filterPoints = () => {
    let filteredPoints: Record<string, { value: number; timestamp: Date }[]> = {};
    if (!boolean) {
      const chartWidth = canvasRef.current?.width;
      const minBound = bounds?.min;
      const maxBound = bounds?.max;

      if (minBound == undefined || maxBound == undefined || chartWidth == undefined) return;

      // time window in milliseconds per pixel
      const window = Math.round((maxBound - minBound) / chartWidth);

      // Filter points so there is only one point per window (pixel) per topic, allPoints are not sorted by timestamps
      Object.entries(mergePoints(httpPoints, wsPoints)).forEach(([topic, points]) => {
        // points are not sorted by timestamps, make the filtering not dependent on order
        const sortedPoints = points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const filtered: { value: number; timestamp: Date }[] = [];
        let lastTimestamp = 0;
        sortedPoints.forEach((point) => {
          if (point.timestamp.getTime() - lastTimestamp > window) {
            filtered.push(point);
            lastTimestamp = point.timestamp.getTime();
          }
        });
        filteredPoints[topic] = filtered;
      });
    } else {
      filteredPoints = mergePoints(httpPoints, wsPoints);
    }

    // filter duplicates and sort by timestamp
    Object.entries(filteredPoints).forEach(([topic, points]) => {
      const uniquePoints = points.filter((point, index, self) => self.findIndex((p) => p.timestamp.getTime() === point.timestamp.getTime()) === index);
      uniquePoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      filteredPoints[topic] = uniquePoints;
    });

    setShownPoints(filteredPoints);
  };

  useEffect(() => {
    const ar = [
      ...Object.values(httpPoints)
        .flat()
        .map((dp) => dp.value),
      ...Object.values(wsPoints)
        .flat()
        .map((dp) => dp.value),
    ];
    setMinMax({
      min: Math.min(...ar),
      max: Math.max(...ar),
    });

    filterPoints();
  }, [httpPoints]);

  useEffect(() => {
    if (!isUserInteracting) return;
    filterPoints();
  }, [bounds]);

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
    if (Object.values(httpPoints).flat().length > 0) {
      // get timestamp from last value of all topics
      const max = Math.max(
        ...Object.values(httpPoints)
          .flat()
          .map((dp) => dp.timestamp.getTime())
      );
      setBounds({
        min: max - defaultBound,
        max: max,
        minDefined: true,
        maxDefined: true,
      });
      setTimeUnitByBounds(minMax.max - defaultBound, minMax.max);
      setIsUserInteracting(false);
    }
  };

  // Add right-click event listener for resetting zoom
  useEffect(() => {
    const canvas = canvasRef.current;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resetZoom();
      }
      resetZoom();
    };

    const handleMouseDown = (_e: MouseEvent) => {
      setMouseUp(false);

      const globalMouseUp = (_e: MouseEvent) => {
        setMouseUp(true);
        document.removeEventListener("mouseup", globalMouseUp);
      };

      document.addEventListener("mouseup", globalMouseUp);
    };

    if (canvas) {
      canvas.addEventListener("contextmenu", handleContextMenu);
      canvas.addEventListener("mousedown", handleMouseDown);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("contextmenu", handleContextMenu);
        canvas.removeEventListener("mouseup", handleMouseDown);
      }
    };
  }, [shownPoints]);

  return <>{options != undefined && data != undefined && <canvas className={`${className}`} ref={canvasRef} style={{ ...style, width: "100%", height: "100%" }}></canvas>}</>;
};
