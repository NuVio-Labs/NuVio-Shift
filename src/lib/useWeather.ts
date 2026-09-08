"use client";

import { useEffect, useState } from "react";

export type WeatherState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ok"; temperatureC: number; code: number };

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    if (!("geolocation" in navigator)) {
      Promise.resolve().then(() => {
        if (!cancelled) setState({ status: "unavailable" });
      });
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );

          if (!response.ok) throw new Error("weather request failed");

          const data = await response.json();
          if (cancelled) return;

          setState({
            status: "ok",
            temperatureC: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
          });
        } catch {
          if (!cancelled) setState({ status: "unavailable" });
        }
      },
      () => {
        if (!cancelled) setState({ status: "unavailable" });
      },
      { timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
