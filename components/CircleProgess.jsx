import React from "react";

export default function CircleProgress({
  size = 45,
  progress = 50,
  strokeWidth = 16,
}) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 10) * circumference;

  return (
    <div className="flex justify-center items-center w-fit">
      <svg
        width={size}
        height={size}
        viewBox="-25 -25 250 250"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background circle */}
        <circle
          r={radius}
          cx="100"
          cy="100"
          fill="transparent"
          stroke="#F5DEB3"
          strokeWidth="7"
        />

        {/* Progress circle */}
        <circle
          r={radius}
          cx="100"
          cy="100"
          fill="transparent"
          stroke="#ffbf00"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference}px`}
          strokeDashoffset={`${offset}px`}
          style={{
            transition: "stroke-dashoffset 0.5s ease-out",
          }}
        />

        {/* Center text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#ffbf00"
          fontSize="52px"
          fontWeight="bold"
          transform="rotate(90, 125, 100)"
        >
          {(progress).toFixed(1)}
        </text>
      </svg>
    </div>
  );
}
