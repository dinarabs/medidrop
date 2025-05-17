interface TerrainPoint {
  lat: number;
  lon: number;
  elevation: number;
  slope: number;
  surfaceType: string;
  windExposure: string;
  airDensity: number;
}

const terrainMap: TerrainPoint[] = [
  {
    lat: 52.52,
    lon: 13.405,
    elevation: 80,
    slope: 5,
    surfaceType: "urban",
    windExposure: "low",
    airDensity: 1.2,
  },
  {
    lat: 52.521,
    lon: 13.406,
    elevation: 120,
    slope: 15,
    surfaceType: "forest",
    windExposure: "medium",
    airDensity: 1.15,
  },
  {
    lat: 52.522,
    lon: 13.407,
    elevation: 180,
    slope: 25,
    surfaceType: "hill",
    windExposure: "high",
    airDensity: 1.1,
  },
  {
    lat: 52.523,
    lon: 13.408,
    elevation: 90,
    slope: 10,
    surfaceType: "open",
    windExposure: "low",
    airDensity: 1.2,
  },
  {
    lat: 52.524,
    lon: 13.409,
    elevation: 60,
    slope: 3,
    surfaceType: "urban",
    windExposure: "low",
    airDensity: 1.21,
  },
];

export async function getTerrainData(lat: number, lon: number) {
  const closest = terrainMap.reduce((prev, curr) => {
    const prevDist = Math.abs(prev.lat - lat) + Math.abs(prev.lon - lon);
    const currDist = Math.abs(curr.lat - lat) + Math.abs(curr.lon - lon);
    return currDist < prevDist ? curr : prev;
  });

  return closest;
}
