export async function checkWeather(lat: number, lon: number) {
  // mock data
  return {
    windSpeed: 12, // m/s
    windDirection: 45, // degrees from true north (0-359)
    visibility: 8000, // in meters
    isSafe: true, // this would be logic based
    reason: "",
  };
}
