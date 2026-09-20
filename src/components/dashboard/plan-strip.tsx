"use client";
import { useEffect, useRef, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { Button } from "@/components/motion/button/base";

export function PlanStrip({ children }: { children: React.ReactNode }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const checkScroll = () => {
    const node = stripRef.current;
    if (!node) return;
    setCanLeft(node.scrollLeft > 2);
    setCanRight(node.scrollLeft < node.scrollWidth - node.clientWidth - 2);
  };
  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);
  const move = (direction: number) =>
    stripRef.current?.scrollBy({ left: direction * 260, behavior: "smooth" });
  return (
    <div className="relative min-w-0">
      <div
        ref={stripRef}
        onScroll={checkScroll}
        onWheel={(event) => {
          if (stripRef.current)
            stripRef.current.scrollLeft +=
              Math.abs(event.deltaX) > Math.abs(event.deltaY)
                ? event.deltaX
                : event.deltaY;
        }}
        className="flex min-w-0 gap-3 overflow-x-auto pb-1 scrollbar-thin"
      >
        {children}
      </div>
      {canLeft && (
        <Button
          variant="secondary"
          iconOnly
          aria-label="向左查看更多"
          onClick={() => move(-1)}
          className="absolute left-2 top-1/2 size-8 -translate-y-1/2 rounded-full p-0 shadow-md"
        >
          <RiArrowLeftSLine className="size-4" aria-hidden />
        </Button>
      )}
      {canRight && (
        <Button
          variant="secondary"
          iconOnly
          aria-label="向右查看更多"
          onClick={() => move(1)}
          className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full p-0 shadow-md"
        >
          <RiArrowRightSLine className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}

