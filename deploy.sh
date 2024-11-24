#!/bin/bash

echo "=== 站点管理系统部署脚本 ==="

# 检查系统类型
check_system_type() {
    if [ -f /etc/redhat-release ]; then
        echo "RHEL"
    elif [ -f /etc/debian_version ]; then
        echo "DEBIAN"
    elif [ -f /etc/arch-release ]; then
        echo "ARCH"
    else
        echo "UNKNOWN"
    fi
}

# 检查Python版本
check_python_version() {
    if ! command -v python3 &> /dev/null; then
        echo "Python 3 未安装"
        return 1
    fi
    
    local version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if [ "$version" != "3.6" ]; then
        echo "当前Python版本为 $version，需要Python 3.6"
        return 1
    fi
    return 0
}

# 安装Python 3.6 (CentOS/RHEL)
install_python36_centos() {
    echo "正在安装Python 3.6..."
    
    # 安装EPEL仓库
    sudo yum install -y epel-release
    
    # 安装Python 3.6
    sudo yum install -y python36 python36-devel python36-pip
    
    # 验证安装
    python3.6 --version
    pip3.6 --version
}

# 主安装流程
echo "1. 检查环境..."
SYSTEM_TYPE=$(check_system_type)

if ! check_python_version; then
    if [ "$SYSTEM_TYPE" = "RHEL" ]; then
        echo "正在安装Python 3.6..."
        install_python36_centos
    else
        echo "错误: 请手动安装Python 3.6"
        exit 1
    fi
fi

# 安装系统依赖
echo "2. 安装系统依赖..."
if [ "$SYSTEM_TYPE" = "RHEL" ]; then
    sudo yum install -y python3-devel libffi-devel openssl-devel gcc python3-pip sqlite-devel
    sudo yum groupinstall -y "Development Tools"
elif [ "$SYSTEM_TYPE" = "DEBIAN" ]; then
    sudo apt-get update
    sudo apt-get install -y python3.6-dev libffi-dev libssl-dev gcc build-essential python3.6-venv libsqlite3-dev
elif [ "$SYSTEM_TYPE" = "ARCH" ]; then
    sudo pacman -Sy python-pip base-devel openssl sqlite
fi

# 项目根目录
PROJECT_ROOT=$(pwd)

# 创建并激活虚拟环境
echo "3. 创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3.6 -m venv venv
    echo "虚拟环境创建成功"
else
    echo "虚拟环境已存在，跳过创建"
fi

# 激活虚拟环境
source venv/bin/activate

# 升级pip和setuptools到兼容版本
echo "4. 升级pip和setuptools..."
pip install --upgrade "pip<21.0" "setuptools<45.0" wheel

# 安装Python依赖
echo "5. 安装Python依赖..."
pip install -r requirements.txt

# 如果安装失败，尝试单独安装每个包
if [ $? -ne 0 ]; then
    echo "尝试单独安装依赖..."
    pip install fastapi
    pip install uvicorn
    pip install paramiko
    pip install websockets
    pip install python-multipart
    pip install python-jose[cryptography]
    pip install passlib[bcrypt]
    pip install python-dotenv
    pip install aiofiles
fi

# 初始化数据库
echo "7. 初始化数据库..."
if [ ! -f sites.db ]; then
    if [ -f database/schema.sql ]; then
        sqlite3 sites.db < database/schema.sql
        echo "数据库创建成功"
    else
        echo "错误: 数据库schema文件不存在"
        exit 1
    fi
else
    echo "数据库已存在，跳过创建"
fi

# 检查并创建必要的目录
echo "8. 检查项目结构..."
for dir in frontend/{css,css/components,js,js/utils,js/api,js/components/{sites,servers,monitor},static}; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "创建目录: $dir"
    fi
done

# 确保目录权限正确
chmod -R 755 frontend

# 检查前端文件
echo "9. 检查前端文件..."
for file in frontend/css/style.css frontend/js/api.js frontend/js/app.js frontend/index.html; do
    if [ ! -f "$file" ]; then
        echo "警告: 缺少文件 $file"
    fi
done

# 检查后端文件
echo "10. 检查后端文件..."
if [ ! -f "backend/main.py" ]; then
    echo "警告: 缺少后端主文件 backend/main.py"
fi

# 创建启动脚本
echo "11. 创建启动脚本..."
cat > start.sh << 'EOL'
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
EOL

chmod +x start.sh

# 创建停止脚本
echo "12. 创建停止脚本..."
cat > stop.sh << 'EOL'
#!/bin/bash

echo "停止服务..."

# 停止服务
if [ -f server.pid ]; then
    kill $(cat server.pid) 2>/dev/null
    rm server.pid
fi

echo "服务已止"
EOL

chmod +x stop.sh 
chmod +x uninstall.sh

# 在检查项目结构部分添加
echo "13. 准备客户端文件..."
if [ ! -d "client" ]; then
    mkdir -p client
fi

# 复制客户端文件
cp -r client/* client/
chmod +x client/monitor.py

# 创建客户端 requirements.txt
cat > client/requirements.txt << 'EOL'
psutil==5.8.0
websockets==9.1
python-dotenv==0.19.0
EOL

# 创建客户端配置文件模板
cat > client/config.json.template << 'EOL'
{
    "server_url": "ws://SERVER_IP:9001/ws",
    "server_id": "SERVER_ID",
    "interval": 60
}
EOL

# 创建服务文件模板
cat > client/monitor.service.template << 'EOL'
[Unit]
Description=Server Monitor Client
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/monitor-client
Environment=PATH=/opt/monitor-client/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/opt/monitor-client/venv/bin/python monitor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

echo "=== 部署完成 ==="
echo "使用说明:"
echo "1. 启动服务: ./start.sh"
echo "2. 停止服务: ./stop.sh"
echo "3. 卸载系统: ./uninstall.sh" 