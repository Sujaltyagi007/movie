import React from "react";

export default function MovieView() {
  return (
    <div
      className={`${
        open
          ? "w-[calc(98vw_-_var(--sidebar-width))] left-2"
          : "w-[calc(97.5vw)] left-3"
      } h-[65vh] rounded-2xl absolute  top-2 `}
    ></div>
  );
}
