"use client";

import { useState } from "react";
import { MapPin, PhoneCall, ChevronDown } from "lucide-react";

const DELIVERY_LOCATIONS = [
  { name: "Dehradun", time: "Today 6 PM" },
];

export function DeliveryBar() {
  const [selectedLocation, setSelectedLocation] = useState(DELIVERY_LOCATIONS[0]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-emerald-700 text-white text-xs px-4 py-2">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 cursor-pointer hover:text-emerald-200 transition-colors"
            >
              <span>
                Deliver to:{" "}
                <strong className="underline decoration-dotted underline-offset-2">
                  {selectedLocation.name}
                </strong>
              </span>
              <span className="text-emerald-300 font-medium">
                / {selectedLocation.time}
              </span>
              <ChevronDown className="w-3 h-3 text-emerald-300" />
            </button>

            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-[45]"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 min-w-[200px] py-1">
                  {DELIVERY_LOCATIONS.map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        selectedLocation.name === loc.name
                          ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>{loc.name}</span>
                      <span className="text-[10px] text-slate-400">{loc.time}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span className="hidden sm:inline-block text-emerald-200">
            | Standard Delivery (Same Day)
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-emerald-200 font-medium">
          <PhoneCall className="w-3 h-3" /> Support
        </div>
      </div>
    </div>
  );
}