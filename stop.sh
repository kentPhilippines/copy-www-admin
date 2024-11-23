#!/bin/bash

echo "停止服务..."

# 停止服务
if [ -f server.pid ]; then
    kill $(cat server.pid) 2>/dev/null
    rm server.pid
fi

echo "服务已停止" 