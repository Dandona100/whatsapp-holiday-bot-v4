#!/bin/bash
# Start WhatsApp Holiday Bot — single command

cd "$(dirname "$0")"

# Start MySQL if not running
docker start whatsapp-bot-mysql 2>/dev/null || echo "MySQL already running"
sleep 3

# Start server in background
cd server
node src/app.js &
SERVER_PID=$!
echo "Server started (PID: $SERVER_PID)"

# Start client
cd ../client
npx vite --port 3000 &
CLIENT_PID=$!
echo "Client started (PID: $CLIENT_PID)"

echo ""
echo "==================================="
echo "  WhatsApp Holiday Bot Running"
echo "  UI:     http://localhost:3000"
echo "  API:    http://localhost:3001"
echo "  Login:  admin / admin123"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop"

# Wait and cleanup on exit
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; echo 'Stopped'" EXIT
wait
