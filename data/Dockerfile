# Use a lightweight Python image
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY . .

# Install dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Expose port Flask runs on
EXPOSE 5000

# Run the app
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
