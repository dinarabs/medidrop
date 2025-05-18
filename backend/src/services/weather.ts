import fetch from "node-fetch";
import { config } from "../config/env";

export async function checkWeather(lat: number, lon: number) {
  const apiKey = config.weatherApiKey;
  const query = `${lat},${lon}`;
  const url = `http://api.weatherstack.com/current?access_key=${apiKey}&query=${query}&units=m`;

  const response = await fetch(url);
  if (!response.ok) {
    return {
      windSpeed: 0,
      windDirection: 0,
      visibility: 0,
      isSafe: false,
      reason: "Failed to fetch weather data",
    };
  }

  const data = (await response.json()) as any;

  if (data.error) {
    return {
      windSpeed: 0,
      windDirection: 0,
      visibility: 0,
      isSafe: false,
      reason: data.error.info || "Weatherstack API error",
    };
  }

  const windSpeed = data.current?.wind_speed ?? 0;
  const windDirection = data.current?.wind_degree ?? 0;
  const visibility = data.current?.visibility ?? 0;

  const windSpeedMs = windSpeed / 3.6;
  const visibilityM = visibility * 1000;

  const isSafe = windSpeedMs < 15 && visibilityM > 5000;
  const reason = !isSafe
    ? `Unsafe: windSpeed=${windSpeedMs.toFixed(
        1
      )}m/s, visibility=${visibilityM}m`
    : "";

  return {
    windSpeed: windSpeedMs,
    windDirection,
    visibility: visibilityM,
    isSafe,
    reason,
  };
}
