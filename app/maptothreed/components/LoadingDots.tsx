"use client";

import { useEffect, useState } from "react";

type Props = {
  interval?: number; // ms between updates
  maxDots?: number; // maximum dots to show
  className?: string;
  prefix?: string; // text before the dots, default 'Loading'
};

export default function LoadingDots({
  interval = 300,
  maxDots = 3,
  className = "",
  prefix = "",
}: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => (c + 1) % (maxDots + 1)); // cycles 0..maxDots
    }, interval);
    return () => clearInterval(id);
  }, [interval, maxDots]);

  const dots = ".".repeat(count);

  return (
    <span aria-live="polite" className={className}>
      {prefix}
      {dots}
    </span>
  );
}
