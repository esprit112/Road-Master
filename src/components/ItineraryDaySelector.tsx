import React, { useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface Day {
  day: number;
  [key: string]: any;
}

interface ItineraryDaySelectorProps {
  itinerary: Day[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

export function ItineraryDaySelector({ itinerary, selectedDay, onSelectDay }: ItineraryDaySelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [selectedDay]);

  return (
    <div 
      ref={scrollRef}
      className="flex items-center gap-2 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/20 overflow-x-auto max-w-full no-scrollbar w-full scroll-smooth"
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {itinerary.map((day) => (
        <button 
          key={day.day}
          ref={selectedDay === day.day ? activeTabRef : null}
          onClick={() => onSelectDay(day.day)}
          className={cn(
            "px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap min-w-[100px] shrink-0",
            selectedDay === day.day 
              ? "bg-[#1A237E] text-white shadow-lg scale-105" 
              : "text-[#1A237E]/60 hover:bg-white/50"
          )}
        >
          Day {day.day}
        </button>
      ))}
    </div>
  );
}
