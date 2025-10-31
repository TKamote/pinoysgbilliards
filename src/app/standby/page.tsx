"use client";

import { useState, useEffect } from "react";

const StandbyPage = () => {
  const [selectedStartTime, setSelectedStartTime] = useState("15:00"); // 3:00 PM
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);

  // Generate start time options (12:00 PM to 8:00 PM in 30-minute intervals)
  const timeOptions = [];
  for (let hour = 12; hour <= 20; hour++) {
    for (let minutes = 0; minutes < 60; minutes += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      const displayTime = new Date(
        `2000-01-01T${timeString}`
      ).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      timeOptions.push({
        value: timeString,
        label: displayTime,
      });
    }
  }

  // Load persisted state on component mount
  useEffect(() => {
    const loadPersistedState = () => {
      const savedStartTime = localStorage.getItem("standby-start-time");
      const savedIsRunning = localStorage.getItem("standby-is-running");
      const savedTimeLeft = localStorage.getItem("standby-time-left");
      const savedStartTimestamp = localStorage.getItem(
        "standby-start-timestamp"
      );

      if (savedStartTime) {
        setSelectedStartTime(savedStartTime);
      }

      if (savedIsRunning === "true" && savedTimeLeft && savedStartTimestamp) {
        const startTimestamp = parseInt(savedStartTimestamp);
        const now = Date.now();
        const elapsed = Math.floor((now - startTimestamp) / 1000);
        const remaining = parseInt(savedTimeLeft) - elapsed;

        if (remaining > 0) {
          setTimeLeft(remaining);
          setIsRunning(true);
        } else {
          setTimeLeft(0);
          setIsRunning(false);
          localStorage.removeItem("standby-start-time");
          localStorage.removeItem("standby-is-running");
          localStorage.removeItem("standby-time-left");
          localStorage.removeItem("standby-start-timestamp");
        }
      }
    };

    loadPersistedState();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            localStorage.removeItem("standby-start-time");
            localStorage.removeItem("standby-is-running");
            localStorage.removeItem("standby-time-left");
            localStorage.removeItem("standby-start-timestamp");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const startTimer = () => {
    // Calculate time until selected start time
    const now = new Date();
    const today = now.toDateString();
    const selectedDateTime = new Date(`${today} ${selectedStartTime}`);

    // If selected time has passed today, set for tomorrow
    if (selectedDateTime <= now) {
      selectedDateTime.setDate(selectedDateTime.getDate() + 1);
    }

    const timeUntilStart = Math.floor(
      (selectedDateTime.getTime() - now.getTime()) / 1000
    );

    setTimeLeft(timeUntilStart);
    setIsRunning(true);

    // Save to localStorage
    localStorage.setItem("standby-start-time", selectedStartTime);
    localStorage.setItem("standby-is-running", "true");
    localStorage.setItem("standby-time-left", timeUntilStart.toString());
    localStorage.setItem("standby-start-timestamp", now.getTime().toString());
  };

  const stopTimer = () => {
    setIsRunning(false);
    localStorage.setItem("standby-is-running", "false");
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(0);

    // Clear localStorage
    localStorage.removeItem("standby-start-time");
    localStorage.removeItem("standby-is-running");
    localStorage.removeItem("standby-time-left");
    localStorage.removeItem("standby-start-timestamp");
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Tournament Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PBS 10-Ball @ Klassic Club
          </h1>
          <div className="w-24 h-1 bg-blue-600 mx-auto rounded"></div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Tournament Countdown
            </h2>

            {/* Timer Display */}
            <div className="mb-8">
              <div className="text-6xl font-mono font-bold text-blue-600 mb-4">
                {formatTime(timeLeft)}
              </div>

              {timeLeft === 0 && !isRunning && (
                <div className="text-2xl text-gray-800">
                  Tournament Complete! 🏆
                </div>
              )}
            </div>

            {/* Time Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Tournament Start Time:
              </label>
              <div className="max-w-xs mx-auto">
                <select
                  value={selectedStartTime}
                  onChange={(e) => setSelectedStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-medium text-gray-900"
                >
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center space-x-4">
              {!isRunning && timeLeft === 0 && (
                <button
                  onClick={startTimer}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ▶️ Start Tournament
                </button>
              )}

              {isRunning && (
                <button
                  onClick={stopTimer}
                  className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ⏸️ Pause
                </button>
              )}

              {!isRunning && timeLeft > 0 && (
                <button
                  onClick={startTimer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ▶️ Resume
                </button>
              )}

              <button
                onClick={resetTimer}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandbyPage;
