#!/bin/bash

echo "正在停止服务..."

# 停止后端服务
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    kill $BACKEND_PID 2>/dev/null || true
    rm backend.pid
fi

# 停止前端服务
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    kill $FRONTEND_PID 2>/dev/null || true
    rm frontend.pid
fi

# 确保所有Python进程都被停止
pkill -f "python3 -m http.server 9001" 2>/dev/null || true
pkill -f "python backend/main.py" 2>/dev/null || true

echo "服务已停止" 