#!/bin/bash
# Test the chat webhook locally

echo "Testing chat webhook..."
curl -X POST http://localhost:3000/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "What are your office hours?", "sessionId": "test-123"}' \
  -v
