#!/bin/bash

echo "=== 站点管理系统部署脚本 ==="

# 检查必要的命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "错误: 请先安装 $1"
        exit 1
    fi
}

# 检查必要的命令
echo "1. 检查环境..."
check_command python3
check_command pip3
check_command sqlite3

# 项目根目录
PROJECT_ROOT=$(pwd)

# 创建并激活虚拟环境
echo "2. 创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "虚拟环境创建成功"
else
    echo "虚拟环境已存在，跳过创建"
fi

# 激活虚拟环境
source venv/bin/activate

# 安装Python依赖
echo "3. 安装Python依赖..."
pip install -r requirements.txt || {
    echo "requirements.txt 不存在，安装基本依赖..."
    pip install fastapi uvicorn paramiko
}

# 初始化数据库
echo "4. 初始化数据库..."
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
echo "5. 检查项目结构..."
for dir in frontend/{css,js} backend; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "创建目录: $dir"
    fi
done

# 检查前端文件
echo "6. 检查前端文件..."
for file in frontend/css/style.css frontend/js/api.js frontend/js/app.js frontend/index.html; do
    if [ ! -f "$file" ]; then
        echo "警告: 缺少文件 $file"
    fi
done

# 检查后端文件
echo "7. 检查后端文件..."
if [ ! -f "backend/main.py" ]; then
    echo "警告: 缺少后端主文件 backend/main.py"
fi

# 创建或更新启动脚本
echo "8. 配置启动脚本..."
cat > start.sh << 'EOL'
#!/bin/bash

# 检查服务是否已运行
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "端口 $1 已被占用，请先停止相关服务"
        exit 1
    fi
}

# 只检查9001端口
check_port 9001

# 激活虚拟环境
source venv/bin/activate

# 启动后端服务
echo "启动后端服务..."
python backend/main.py &
BACKEND_PID=$!

# 启动前端服务
echo "启动前端服务..."
cd frontend && python -m http.server 9001 &
FRONTEND_PID=$!

# 保存PID到文件
echo $BACKEND_PID > ../backend.pid
echo $FRONTEND_PID > ../frontend.pid

echo "服务已启动!"
echo "访问地址: http://localhost:9001"

# 等待服务运行
wait
EOL

chmod +x start.sh

# 创建停止脚本
echo "9. 创建停止脚本..."
cat > stop.sh << 'EOL'
#!/bin/bash

echo "停止服务..."

# 停止后端服务
if [ -f backend.pid ]; then
    kill $(cat backend.pid) 2>/dev/null
    rm backend.pid
fi

# 停止前端服务
if [ -f frontend.pid ]; then
    kill $(cat frontend.pid) 2>/dev/null
    rm frontend.pid
fi

echo "服务已停止"
EOL

chmod +x stop.sh

echo "=== 部署完成 ==="
echo "使用说明:"
echo "1. 启动服务: ./start.sh"
echo "2. 停止服务: ./stop.sh"
echo "3. 卸载系统: ./uninstall.sh" 