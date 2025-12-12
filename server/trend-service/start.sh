#!/bin/bash

# Start script for Style Shepherd Trend Service

set -e

echo "🚀 Starting Style Shepherd Trend Service..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# Install dependencies if needed
if [ ! -f ".venv/bin/uvicorn" ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
fi

# Get port from environment or use default
PORT=${PORT:-8000}

echo "🌐 Starting server on port $PORT..."
echo "📚 API docs available at: http://localhost:$PORT/docs"
echo "❤️  Health check: http://localhost:$PORT/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
uvicorn trend_service:app --reload --port $PORT --host 0.0.0.0
