from flask import Flask, request, jsonify, send_file
from dotenv import load_dotenv
from sentinelhub import SHConfig, MimeType, CRS, BBox, SentinelHubRequest, DataCollection, bbox_to_dimensions
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np
import geojson
from shapely.geometry import Point
import os
import requests

# === Flask app setup ===
app = Flask(__name__)
load_dotenv("../.env")  # Adjust path if needed

# === Load environment variables ===
weather_api_key = os.getenv("OPENWEATHER_API_KEY")
client_id = os.getenv("SENTINEL_CLIENT_ID")
client_secret = os.getenv("SENTINEL_CLIENT_SECRET")

# === Helper functions ===
def get_weather(lat, lon):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={weather_api_key}&units=metric"
    response = requests.get(url)
    weather_data = response.json()
    
    # Add debug logging
    print("Response status:", response.status_code)
    print("Weather data:", weather_data)
    
    if response.status_code == 200 and "main" in weather_data:
        return {
            "location": {"lat": lat, "lon": lon},
            "timestamp": datetime.utcfromtimestamp(weather_data["dt"]).isoformat() + "Z",
            "wind_speed": weather_data["wind"]["speed"],
            "wind_direction": weather_data["wind"]["deg"],
            "temperature": weather_data["main"]["temp"],
            "precipitation": weather_data.get("rain", {}).get("1h", 0.0),
            "visibility": weather_data.get("visibility"),
            "cloud_cover": weather_data["clouds"]["all"],
            "humidity": weather_data["main"]["humidity"],
            "storm_warning": weather_data["weather"][0]["main"].lower() in ["thunderstorm"]
        }
    else:
        return {"error": "Failed to fetch weather data", "details": weather_data}

def get_satellite_image(lat, lon):
    config = SHConfig()
    config.sh_client_id = client_id
    config.sh_client_secret = client_secret

    bbox = BBox([lon - 0.01, lat - 0.01, lon + 0.01, lat + 0.01], crs=CRS.WGS84)
    image_size = bbox_to_dimensions(bbox, resolution=10)

    request = SentinelHubRequest(
        data_folder='satellite_images',
        evalscript="""
        //VERSION=3
        function setup() {
            return { input: ["B04", "B03", "B02"], output: { bands: 3 } };
        }
        function evaluatePixel(sample) {
            return [sample.B04, sample.B03, sample.B02];
        }
        """,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L1C,
                time_interval=("2025-05-01", "2025-05-17")
            )
        ],
        responses=[SentinelHubRequest.output_response("default", MimeType.PNG)],
        bbox=bbox,
        size=image_size,
        config=config
    )

    image = request.get_data()[0]
    plt.imshow(image)
    plt.axis("off")
    plt.title("Sentinel-2 True Color")
    filepath = "satellite_images/sat_image.png"
    plt.savefig(filepath, bbox_inches='tight')
    plt.close()
    return filepath

def generate_terrain_geojson(base_lat, base_lon, delivery_lat, delivery_lon):
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    config = SHConfig()
    config.sh_client_id = client_id
    config.sh_client_secret = client_secret

    bbox_dem = BBox([delivery_lon - 0.01, delivery_lat - 0.01, delivery_lon + 0.01, delivery_lat + 0.01], crs=CRS.WGS84)
    size = bbox_to_dimensions(bbox_dem, resolution=30)

    dem_collection = DataCollection.define(
        name='COPERNICUS_DEM', api_id='DEM', service_url='https://services.sentinel-hub.com')

    request = SentinelHubRequest(
        data_folder='.',  # Changed to current directory
        evalscript="""
        //VERSION=3
        function setup() {
            return { input: ["DEM"], output: { bands: 1 } };
        }
        function evaluatePixel(sample) {
            return [sample.DEM];
        }
        """,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=dem_collection,
                time_interval=("2020-01-01", "2025-01-01")
            )
        ],
        responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
        bbox=bbox_dem,
        size=size,
        config=config
    )

    dem = request.get_data()[0]

    def latlon_to_pixel(lat, lon):
        min_lon, min_lat, max_lon, max_lat = bbox_dem
        x_rel = (lon - min_lon) / (max_lon - min_lon)
        y_rel = (max_lat - lat) / (max_lat - min_lat)
        x_pix = int(x_rel * size[0])
        y_pix = int(y_rel * size[1])
        return y_pix, x_pix

    N = 20
    lats = np.linspace(base_lat, delivery_lat, N)
    lons = np.linspace(base_lon, delivery_lon, N)
    features = []

    for lat_pt, lon_pt in zip(lats, lons):
        row, col = latlon_to_pixel(lat_pt, lon_pt)
        alt = float(dem[row, col]) if 0 <= row < dem.shape[0] and 0 <= col < dem.shape[1] else None
        point_geom = Point((lon_pt, lat_pt))
        features.append(geojson.Feature(geometry=point_geom, properties={"altitude_m": alt}))

    feature_collection = geojson.FeatureCollection(features)
    filepath = "terrain_path.geojson"  # Removed 'data/' prefix
    with open(filepath, "w") as f:
        geojson.dump(feature_collection, f)

    return filepath

# === API Endpoints ===
@app.route("/api/weather", methods=["GET"])
def weather():
    lat = float(request.args.get("lat"))
    lon = float(request.args.get("lon"))
    return jsonify(get_weather(lat, lon))

@app.route("/api/satellite", methods=["GET"])
def satellite():
    lat = float(request.args.get("lat"))
    lon = float(request.args.get("lon"))
    filepath = get_satellite_image(lat, lon)
    return send_file(filepath, mimetype='image/png')

@app.route("/api/terrain", methods=["GET"])
def terrain():
    base_lat = float(request.args.get("base_lat"))
    base_lon = float(request.args.get("base_lon"))
    delivery_lat = float(request.args.get("lat"))
    delivery_lon = float(request.args.get("lon"))
    filepath = generate_terrain_geojson(base_lat, base_lon, delivery_lat, delivery_lon)
    return send_file(filepath, mimetype='application/geo+json')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
