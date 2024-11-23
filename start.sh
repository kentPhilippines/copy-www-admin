#!/bin/bash

# 检查服务是否已运行
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "端口 $1 已被占用，请先停止相关服务"
        exit 1
    fi
}

# 检查9001端口
check_port 9001

# 激活虚拟环境
source venv/bin/activate

# 启动后端服务
echo "启动服务..."
python backend/main.py &
SERVER_PID=$!

# 保存PID到文件
echo $SERVER_PID > server.pid

echo "服务已启动!"
echo "访问地址: http://localhost:9001"

# 等待服务运行
wait