from waitress import serve
from app import app
import os
import logging

# Configure logging
logging.basicConfig(
    filename='logs/production.log',
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
)

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 5000))
    
    # Log startup
    logging.info(f'Starting production server on port {port}')
    
    # Start the server
    serve(
        app,
        host='0.0.0.0',
        port=port,
        threads=4,  # Adjust based on your needs
        url_scheme='https',  # If behind HTTPS proxy
        channel_timeout=30,  # Timeout for requests
        cleanup_interval=30,  # How often to clean up idle connections
        max_request_header_size=262144,  # 256KB
        max_request_body_size=1073741824  # 1GB
    ) 