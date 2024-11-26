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
    fi
}

# 安装系统依赖
echo "安装系统依赖..."
SYSTEM_TYPE=$(check_system_type)

if [ "$SYSTEM_TYPE" = "DEBIAN" ]; then
    # Ubuntu/Debian 系统
    sudo apt-get update
    sudo apt-get install -y python3-dev gcc python3-pip libffi-dev libssl-dev
    sudo apt-get install -y python3-psutil python3-venv sqlite3
elif [ "$SYSTEM_TYPE" = "RHEL" ]; then
    # CentOS/RHEL 系统
    sudo yum install -y epel-release
    sudo yum install -y python3-devel gcc python3-pip sqlite
    sudo yum install -y python3-psutil python3-virtualenv
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

# 验证虚拟环境
which python3
python3 --version

# 升级基础工具
python3 -m pip install --upgrade pip setuptools wheel

# 安装依赖
echo "开始安装依赖..."

# 安装每个包并验证
install_and_verify() {
    package=$1
    import_name=$2
    echo "安装 $package..."
    python3 -m pip install --no-cache-dir $package || {
        echo "尝试安装依赖..."
        python3 -m pip install --no-cache-dir typing-extensions
        python3 -m pip install --no-cache-dir $package
    }
    if [ $? -ne 0 ]; then
        echo "安装 $package 失败"
        return 1
    fi
    
    if [ ! -z "$import_name" ]; then
        echo "验证 $import_name..."
        python3 -c "import $import_name" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "导入 $import_name 失败"
            return 1
        fi
    fi
    
    echo "$package 安装成功"
    return 0
}

# 按顺序安装并验证每个包
install_and_verify "wheel" || exit 1
install_and_verify "typing-extensions>=4.0.0" || exit 1
install_and_verify "psutil" "psutil" || exit 1
install_and_verify "cryptography==36.0.0" "cryptography" || exit 1
install_and_verify "pydantic>=1.8.0,<2.0.0" "pydantic" || exit 1
install_and_verify "fastapi==0.65.2" "fastapi" || exit 1  # 使用较低版本
install_and_verify "uvicorn==0.14.0" "uvicorn" || exit 1
install_and_verify "python-multipart==0.0.5" || exit 1
install_and_verify "python-jose[cryptography]==3.2.0" || exit 1
install_and_verify "passlib[bcrypt]==1.7.4" "passlib" || exit 1
install_and_verify "python-dotenv==0.19.0" || exit 1
install_and_verify "aiofiles==0.7.0" "aiofiles" || exit 1
install_and_verify "paramiko>=2.8.1" "paramiko" || exit 1

echo "所有依赖安装完成"

# 最终验证
python3 -c "
import fastapi
import uvicorn
import psutil
import cryptography
import pydantic
print('所有依赖验证成功')
"

if [ $? -ne 0 ]; then
    echo "最终依赖验证失败"
    exit 1
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

# 在初始化部分添加
echo "创建日志目录..."
mkdir -p logs
chmod 755 logs

# 启动服务时重定向日志
python backend/main.py > logs/app.log 2>&1 &
echo $! > backend.pid

echo "=== 部署完成 ==="
echo "使用说明:"
echo "1. 启动服务: ./start.sh"
echo "2. 停止服务: ./stop.sh"
echo "3. 卸载系统: ./uninstall.sh" 