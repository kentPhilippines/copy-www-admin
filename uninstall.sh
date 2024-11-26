#!/bin/bash

echo "=== 站点管理系统卸载脚本 ==="

# 停止运行中的服务
echo "1. 停止运行中的服务..."
pkill -f "python backend/main.py"
pkill -f "python -m http.server"

# 删除虚拟环境
echo "2. 删除虚拟环境..."
if [ -d "venv" ]; then
    rm -rf venv
    echo "虚拟环境已删除"
fi

# 删除数据库
echo "3. 删除数据库..."
if [ -f "sites.db" ]; then
    rm sites.db
    echo "数据库已删除"
fi

# 删除项目文件

echo "=== 卸载完成 ==="

# 询问是否删除卸载脚本自身
read -p "是否删除卸载脚本自身？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -- "$0"
    echo "卸载脚本已删除"
fi 