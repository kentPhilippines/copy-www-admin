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
    sudo apt-get install -y python3-psutil python3-venv  # 添加 python3-venv
elif [ "$SYSTEM_TYPE" = "RHEL" ]; then
    # CentOS/RHEL 系统
    sudo yum install -y epel-release
    sudo yum install -y python3-devel gcc python3-pip
    sudo yum install -y python3-psutil python3-virtualenv  # 添加 python3-virtualenv
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
python3 -m pip install --upgrade pip setuptools wheel

# 清理pip缓存
pip cache purge

# 安装依赖（按特定顺序）
echo "安装Python依赖..."

# 1. 安装基础包
pip install --no-cache-dir wheel
pip install --no-cache-dir psutil

# 2. 安装加密相关包
pip install --no-cache-dir cryptography==36.0.0
pip install --no-cache-dir "python-jose[cryptography]==3.2.0"
pip install --no-cache-dir "passlib[bcrypt]==1.7.4"

# 3. 安装FastAPI相关包
pip install --no-cache-dir fastapi==0.109.2
pip install --no-cache-dir "uvicorn[standard]>=0.15.0,<0.16.0"
pip install --no-cache-dir python-multipart==0.0.5
pip install --no-cache-dir pydantic==2.6.1

# 4. 安装其他依赖
pip install --no-cache-dir paramiko>=2.8.1
pip install --no-cache-dir python-dotenv==0.19.0
pip install --no-cache-dir aiofiles==0.7.0

# 验证安装
echo "验证依赖安装..."
python3 -c "import fastapi; import uvicorn; import psutil; import cryptography; print('依赖验证成功')"

if [ $? -ne 0 ]; then
    echo "依赖安装验证失败"
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

echo "=== 部署完成 ==="
echo "使用说明:"
echo "1. 启动服务: ./start.sh"
echo "2. 停止服务: ./stop.sh"
echo "3. 卸载系统: ./uninstall.sh" 