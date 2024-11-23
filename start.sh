#!/bin/bash

# 检查服务是否已运行
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "端口 $1 已被占用，请先停止相关服务"
        exit 1
    fi
}

# 获取公网IP
get_public_ip() {
    # 尝试多个服务来获取公网IP
    PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipinfo.io/ip)
    if [ -z "$PUBLIC_IP" ]; then
        echo "无法获取公网IP"
        return 1
    fi
    echo "$PUBLIC_IP"
}

# 检查9001端口
check_port 9001

# 激活虚拟环境
source venv/bin/activate

# 启动服务
echo "启动服务..."
python backend/main.py &
SERVER_PID=$!

# 保存PID到文件
echo $SERVER_PID > server.pid

echo "=== 服务启动成功 ==="
echo
echo "本地访问地址: http://localhost:9001"

# 获取并显示公网访问地址
PUBLIC_IP=$(get_public_ip)
if [ ! -z "$PUBLIC_IP" ]; then
    echo "公网访问地址: http://$PUBLIC_IP:9001"
    echo
    echo "如果无法通过公网地址访问，请检查防火墙设置："
    echo
    echo "1. CentOS/RHEL系统："
    echo "   开放端口命令："
    echo "   sudo firewall-cmd --zone=public --add-port=9001/tcp --permanent"
    echo "   sudo firewall-cmd --reload"
    echo
    echo "2. Ubuntu/Debian系统："
    echo "   开放端口命令："
    echo "   sudo ufw allow 9001/tcp"
    echo "   sudo ufw reload"
    echo
    echo "3. 阿里云/腾讯云等云服务器："
    echo "   请在控制台安全组中添加入站规则，开放9001端口"
    echo
    echo "4. 检查端口是否开放命令："
    echo "   netstat -tulpn | grep 9001"
    echo
fi

echo "提示："
echo "1. 使用 Ctrl+C 停止服务"
echo "2. 或者使用 ./stop.sh 停止服务"
echo "3. 查看日志：tail -f nohup.out"
echo

# 等待服务运行
wait