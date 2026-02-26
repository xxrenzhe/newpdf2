#!/bin/bash
NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm run dev > dev.log 2>&1 &
DEV_PID=$!
echo "Dev server started with PID $DEV_PID"
echo "Waiting for dev server to be ready..."
sleep 15
echo "Testing..."
bun test-all.ts
echo "Test finished, killing dev server..."
kill $DEV_PID
