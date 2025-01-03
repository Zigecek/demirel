import React from "react";

type DotProps = {
  duration: number;
  interval: number;
  className?: string;
};

export const Dot: React.FC<DotProps> = ({ duration, interval, className }) => {
  const animationName = `fade-opacity-${duration}-${interval}`;

  return (
    <>
      <span
        className={`font-semibold text-green-500 opacity-0 px-1 ${className}`}
        style={{
          animationDuration: `${duration}ms`,
          animationTimingFunction: "linear",
          animationIterationCount: 1,
          animationName: animationName,
        }}>
        ●
      </span>
      <style>{`
        @keyframes ${animationName} {
          0% {
            opacity: ${duration / interval};
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default Dot;
