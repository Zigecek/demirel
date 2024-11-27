import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import "chart.js/auto";
import "chartjs-adapter-date-fns";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import { eachDayOfInterval, startOfDay } from "date-fns";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { useMessages } from "../../../contexts/MessagesContext";
import { useNicknames } from "../../../contexts/NicknamesContext";
import { useTopics } from "../../../hooks/useTopics";
import { postMqttData } from "../../../proxy/endpoints";

ChartJS.register(zoomPlugin, annotationPlugin, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const colors = ["rgba(80, 150, 220, 1)", "rgba(80, 220, 150, 1)", "rgba(220, 150, 80, 1)", "rgba(220, 80, 150, 1)", "rgba(150, 80, 220, 1)", "rgba(150, 220, 80, 1)"];

const defaultBound = 1.5 * 24 * 60 * 60 * 1000;

type GraphProps = {
  topics: string[];
  style?: React.CSSProperties;
  boolean?: boolean;
};

type Bounds = { min: number; max: number; minDefined: boolean; maxDefined: boolean };

export const Graph: React.FC<GraphProps> = ({ topics, style, boolean = false }) => {
  // GLOBAL STATES //
  const chartRef = useRef<any>(null);
  const { addToHistory } = useMessages();
  const { nickname } = useNicknames();

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

    const maxTimestamp = Date.now();
    const defaultView = maxTimestamp - defaultBound;

    const minX = bounds?.minDefined ? bounds.min : defaultView;
    const maxX = bounds?.maxDefined ? bounds.max : maxTimestamp;

    const midnightAnnotations = generateMidnightAnnotations(minX, maxX);

    const datasets = topics.map((topic) => ({
      label: nickname(topic),
      data: dataPoints[topic] ? dataPoints[topic].map((dp) => ({ x: dp.timestamp.getTime(), y: dp.value })) : [],
      borderColor: suspicious[topic] ? "rgba(220, 75, 75, 1)" : colors[topics.indexOf(topic) % colors.length],
      borderWidth: 2,
      fill: false,
      pointRadius: 1,
      animation: true,
    }));

    setData({
      datasets,
    });

    setOptions({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          min:
            Math.min(
              ...Object.values(dataPoints)
                .flat()
                .map((dp) => dp.value)
            ) * 0.9,
          max:
            Math.max(
              ...Object.values(dataPoints)
                .flat()
                .map((dp) => dp.value)
            ) * 1.1,
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
        intersect: false,
      },
      plugins: {
        legend: {
          display: topics.length > 1,
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
            onPan: ({ chart }: { chart: ChartJS }) => {
              onZoomPan(chart);
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
              onZoomPan(chart);
            },
          },
        },
        annotation: {
          annotations: midnightAnnotations,
        },
      },
    });
  }, [dataPoints, isUserInteracting, timeUnit]);

  const onZoomPan = (chart: ChartJS) => {
    setBounds(chart.scales.x.getUserBounds());
    setIsUserInteracting(true);
    resetActivityTimeout();
  };

  useEffect(() => {
    if (bounds == undefined) {
      const maxTimestamp = Date.now();
      const defaultView = maxTimestamp - defaultBound;
      setBounds({
        min: defaultView,
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
    return () => {
      window.removeEventListener("resize", updateChart);
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
    if (Object.values(dataPoints).flat().length > 0) {
      setTimeUnit("day");
      const maxTimestamp = Date.now();
      const defualtView = maxTimestamp - defaultBound;
      setBounds({
        min: defualtView,
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
