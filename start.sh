#!/bin/bash

# 检查端口是否被占用（支持lsof和netstat两种方式）
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t &> /dev/null; then
            echo "端口 $port 已被占用，请先停止相关服务"
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep ":$port " &> /dev/null; then
            echo "端口 $port 已被占用，请先停止相关服务"
            return 1
        fi
    else
        echo "警告: 无法检查端口占用情况（需要lsof或netstat命令）"
    fi
    return 0
}

# 检查系统类型
check_system_type() {
    if [ "$(uname)" = "Darwin" ]; then
        echo "MACOS"
    else
        echo "OTHER"
    fi
}

SYSTEM_TYPE=$(check_system_type)

# 检查9001端口
check_port 9001 || exit 1

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "错误: 虚拟环境不存在，请先运行 deploy.sh"
    exit 1
fi

# 激活虚拟环境（根据系统类型使用不同的激活方式）
if [ "$SYSTEM_TYPE" = "MACOS" ]; then
    source venv/bin/activate || { echo "错误: 无法激活虚拟环境"; exit 1; }
else
    source venv/bin/activate || { echo "错误: 无法激活虚拟环境"; exit 1; }
fi

# 检查Python环境
if ! python3 -c "import fastapi" 2>&1; then
    echo "错误: 缺少必要的Python依赖，请重新运行 deploy.sh"
    deactivate
    exit 1
fi

# 启动服务
echo "启动服务..."
if [ "$SYSTEM_TYPE" = "MACOS" ]; then
    # macOS 下使用 nohup 来运行后台进程
    nohup python3 backend/main.py > nohup.out 2>&1 &
else
    python backend/main.py &
fi

SERVER_PID=$!

# 保存PID到文件
echo $SERVER_PID > server.pid

echo "=== 服务启动成功 ==="
echo
echo "本地访问地址: http://localhost:9001"

# 获取并显示公网访问地址
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipinfo.io/ip)
if [ ! -z "$PUBLIC_IP" ]; then
    echo "公网访问地址: http://$PUBLIC_IP:9001"
fi

echo
echo "提示："
echo "1. 使用 Ctrl+C 停止服务"
echo "2. 或者使用 ./stop.sh 停止服务"
echo "3. 查看日志：tail -f nohup.out"
echo

# 等待服务运行
wait