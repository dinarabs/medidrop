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
import logging
from logging.handlers import RotatingFileHandler
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

# === Flask app setup ===
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# === CORS Configuration ===
CORS(app, resources={
    r"/api/*": {
        "origins": os.getenv("ALLOWED_ORIGINS", "*").split(","),
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# === Rate Limiting ===
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# === Security Headers ===
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
    return response

# === Logging Configuration ===
if not os.path.exists('logs'):
    os.makedirs('logs')
file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('Application startup')

# === Load environment variables ===
load_dotenv("../.env")  # Adjust path if needed

# === Configuration ===
app.config.update(
    SEND_FILE_MAX_AGE_DEFAULT=31536000,  # 1 year in seconds
    MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16MB max file size
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=1800  # 30 minutes
)

weather_api_key = os.getenv("OPENWEATHER_API_KEY")
client_id = os.getenv("SENTINEL_CLIENT_ID")
client_secret = os.getenv("SENTINEL_CLIENT_SECRET")

# === Error Handlers ===
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Server Error: {error}')
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded", "retry_after": e.description}), 429

# === Helper functions ===
def get_weather(lat, lon):
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={weather_api_key}&units=metric"
        response = requests.get(url, timeout=5)  # Added timeout
        weather_data = response.json()
        
        app.logger.info(f"Weather API response status: {response.status_code}")
        
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
            app.logger.error(f"Weather API error: {weather_data}")
            return {"error": "Failed to fetch weather data", "details": weather_data}
    except Exception as e:
        app.logger.error(f"Error fetching weather data: {str(e)}")
        return {"error": "Failed to fetch weather data", "details": str(e)}

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
@limiter.limit("30 per minute")
def weather():
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        return jsonify(get_weather(lat, lon))
    except ValueError:
        return jsonify({"error": "Invalid coordinates"}), 400
    except Exception as e:
        app.logger.error(f"Error in weather endpoint: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/satellite", methods=["GET"])
@limiter.limit("20 per minute")
def satellite():
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        filepath = get_satellite_image(lat, lon)
        return send_file(filepath, mimetype='image/png')
    except ValueError:
        return jsonify({"error": "Invalid coordinates"}), 400
    except Exception as e:
        app.logger.error(f"Error in satellite endpoint: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/terrain", methods=["GET"])
@limiter.limit("20 per minute")
def terrain():
    try:
        base_lat = float(request.args.get("base_lat"))
        base_lon = float(request.args.get("base_lon"))
        delivery_lat = float(request.args.get("lat"))
        delivery_lon = float(request.args.get("lon"))
        filepath = generate_terrain_geojson(base_lat, base_lon, delivery_lat, delivery_lon)
        return send_file(filepath, mimetype='application/geo+json')
    except ValueError:
        return jsonify({"error": "Invalid coordinates"}), 400
    except Exception as e:
        app.logger.error(f"Error in terrain endpoint: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    # Production settings
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
