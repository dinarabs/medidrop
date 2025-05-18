import multiprocessing
import os

# Server socket
bind = "0.0.0.0:" + os.getenv("PORT", "5000")
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"

# Process naming
proc_name = "medidrop"

# SSL
# keyfile = "path/to/keyfile"
# certfile = "path/to/certfile"

# Server mechanics
daemon = False
pidfile = "logs/gunicorn.pid"
umask = 0
user = None
group = None
tmp_upload_dir = None

# Server hooks
def on_starting(server):
    pass

def on_reload(server):
    pass

def on_exit(server):
    pass 