#!/bin/bash

echo "=== 站点管理系统部署脚本 ==="

# 检查系统类型
check_system_type() {
    if [ -f /etc/redhat-release ]; then
        echo "RHEL"
    elif [ -f /etc/debian_version ]; then
        echo "DEBIAN"
    else
        echo "UNKNOWN"
    }
}

# 安装系统依赖
echo "安装系统依赖..."
SYSTEM_TYPE=$(check_system_type)

if [ "$SYSTEM_TYPE" = "DEBIAN" ]; then
    # Ubuntu/Debian 系统
    sudo apt-get update
    sudo apt-get install -y python3-dev gcc python3-pip libffi-dev libssl-dev
    sudo apt-get install -y python3-psutil  # 直接安装系统包
elif [ "$SYSTEM_TYPE" = "RHEL" ]; then
    # CentOS/RHEL 系统
    sudo yum install -y python3-devel gcc python3-pip
    sudo yum install -y python3-psutil  # 直接安装系统包
else
    echo "不支持的操作系统类型"
    exit 1
fi

# 停止现有服务
./stop.sh

# 删除旧的虚拟环境
rm -rf venv

# 创建新的虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 升级pip和安装工具
pip install --upgrade pip setuptools wheel

# 安装Python依赖
echo "安装Python依赖..."

# 先安装基础包
pip install psutil --no-cache-dir

# 安装 cryptography
pip install cryptography==36.0.0

# 然后安装其他依赖
pip install -r requirements.txt

# 如果安装失败，尝试单独安装每个包
if [ $? -ne 0 ]; then
    echo "尝试单独安装依赖..."
    pip install fastapi==0.109.2
    pip install "uvicorn[standard]>=0.15.0,<0.16.0"
    pip install paramiko>=2.8.1
    pip install python-multipart==0.0.5
    pip install "python-jose[cryptography]==3.2.0"
    pip install "passlib[bcrypt]==1.7.4"
    pip install python-dotenv==0.19.0
    pip install aiofiles==0.7.0
    pip install pydantic==2.6.1
fi

# 初始化数据库
echo "6. 初始化数据库..."
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

# 检查项目结构
echo "7. 检查项目结构..."
for dir in frontend/{css,css/components,js,js/utils,js/api,js/components/{sites,servers,monitor},static/{images,videos,css}}; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "创建目录: $dir"
    fi
done

# 确保静态资源文件存在
if [ ! -f "frontend/static/favicon.ico" ]; then
    echo "警告: 缺少favicon.ico文件"
fi

# 设置文件权限
chmod -R 755 frontend
chmod 644 frontend/static/favicon.ico
chmod 644 frontend/static/css/theme.css
chmod 644 frontend/static/images/*.svg
chmod 644 frontend/static/videos/README.md


# 给 /start.sh 权限
chmod 755 start.sh
chmod 755 stop.sh
chmod 755 uninstall.sh

echo "=== 部署完成 ==="
echo "使用说明:"
echo "1. 启动服务: ./start.sh"
echo "2. 停止服务: ./stop.sh"
echo "3. 卸载系统: ./uninstall.sh" 