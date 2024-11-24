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
    pip install fastapi==0.65.2
    pip install uvicorn==0.14.0
    pip install paramiko==2.7.2
    pip install websockets==9.1
    pip install python-multipart==0.0.5
    pip install "python-jose[cryptography]==3.2.0"
    pip install "passlib[bcrypt]==1.7.4"
    pip install python-dotenv==0.19.0
    pip install aiofiles==0.7.0
    pip install cryptography==3.3.2
    pip install pydantic==1.8.2
    pip install typing-extensions==3.10.0.2
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

echo "=== 部署完成 ==="
echo "使用说明:"
echo "1. 启动服务: ./start.sh"
echo "2. 停止服务: ./stop.sh"
echo "3. 卸载系统: ./uninstall.sh" 