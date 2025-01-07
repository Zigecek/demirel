import React, { useEffect, useRef } from "react";

interface WindGaugeProps {
  direction: number;
  valueF: (msg: any) => string;
  className?: string;
}

const WindGauge: React.FC<WindGaugeProps> = ({ direction, valueF, className = "" }) => {
  const arrowRef = useRef<HTMLDivElement>(null);

  // Map wind direction to Czech labels, starting from North at index 0
  const directions = ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"];

  useEffect(() => {
    if (arrowRef.current) {
      arrowRef.current.style.transition = "transform 0.5s ease-in-out";
    }
  }, [direction]);

  return (
    <div className={`flex items-center justify-center w-full h-full ${className}`}>
      <div className="relative aspect-square w-full max-w-[20rem]">
        {/* Outer Circular Grid */}
        <div className="absolute inset-0 rounded-full grid place-items-center">
          {/* Radar-style concentric circles */}
          <div
            className="absolute rounded-full border-gray-500"
            style={{
              width: `30%`,
              height: `30%`,
              borderWidth: "1px",
            }}
          />
          <div
            className="absolute rounded-full border-gray-500"
            style={{
              width: `50%`,
              height: `50%`,
              borderWidth: "1px",
            }}
          />
          <div
            className="absolute rounded-full border-gray-500"
            style={{
              width: `90%`,
              height: `90%`,
              borderWidth: "1px",
            }}
          />

          {/* Radial Lines */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <div
              key={`line-${angle}`}
              className="absolute w-[1px] h-full bg-gray-500"
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: "center center",
              }}
            />
          ))}

          {/* Static Direction Labels */}
          {directions.map((dir, index) => {
            // Angle calculation: We want 0 to be top (North), 2 to be right (East), 4 to be bottom (South), and 6 to be left (West)
            const angle = index * 45 - 90; // Shift by -90 degrees to position 0 at the top
            return (
              <div
                key={dir}
                className="absolute text-gray-700 dark:text-gray-300 text-[clamp(0.8rem, 2vw, 1rem)] font-bold"
                style={{
                  top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * 40}%)`,
                  left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * 40}%)`,
                  transform: `translate(-50%, -50%)`,
                }}>
                {dir}
              </div>
            );
          })}
        </div>

        {/* Wind Indicator Arrow */}
        <div
          ref={arrowRef}
          className="absolute w-[1%] h-[40%] bg-blue-500 dark:bg-blue-400 rounded-t-full"
          style={{
            transform: `rotate(${direction}deg)`, // Apply the wind direction rotation
            transformOrigin: "center bottom",
            top: "10%",
            left: "50%",
          }}></div>

        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 w-[12%] h-[12%] bg-gray-100 dark:bg-gray-700 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md"></div>

        {/* Direction Label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 text-base font-bold">{valueF(direction)}</div>
      </div>
    </div>
  );
};

export default WindGauge;
