from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import sqlite3
from pydantic import BaseModel
from datetime import datetime
import os
import paramiko
from typing import Optional, Dict, Any, List
import shutil
import asyncio
from concurrent.futures import ThreadPoolExecutor
import socket
import platform
import getpass
import psutil
import logging
import time

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 在启动时初始化数据库
@app.on_event("startup")
async def startup_event():
    init_database()
    update_servers_table()

# 在关闭时清理资源
@app.on_event("shutdown")
async def shutdown_event():
    pass

# 挂载静态文件目录
app.mount("/js", StaticFiles(directory="frontend/js"), name="javascript")
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# 根路由返回前端首页
@app.get("/")
async def read_root():
    return FileResponse("frontend/index.html")

# 添加favicon.ico路由
@app.get("/favicon.ico")
async def favicon():
    return FileResponse("frontend/static/favicon.ico")

# 数据库连接
def get_db():
    db = sqlite3.connect("sites.db")
    db.row_factory = sqlite3.Row
    return db

# 站点模型
class Site(BaseModel):
    domain: str
    config_path: Optional[str] = None
    ssl_enabled: bool = False

    class Config:
        # 添加配置以支持旧版本
        allow_population_by_field_name = True
        use_enum_values = True

# 服务器模型
class Server(BaseModel):
    name: str
    ip: str
    username: str
    auth_type: str  # 'password' 或 'key'
    password: Optional[str] = None
    key_path: Optional[str] = None

# 命令执行模型
class Command(BaseModel):
    command: str

# 配置SSH密钥存储路径
SSH_KEYS_DIR = "ssh_keys"
if not os.path.exists(SSH_KEYS_DIR):
    os.makedirs(SSH_KEYS_DIR)

# SSH连接处理函数
def get_ssh_client(server_data: dict):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        if server_data['auth_type'] == 'key':
            key_path = server_data['key_path']
            if not os.path.exists(key_path):
                raise HTTPException(status_code=400, detail="SSH密钥文件不存在")
            
            private_key = paramiko.RSAKey.from_private_key_file(key_path)
            ssh.connect(
                server_data['ip'],
                username=server_data['username'],
                pkey=private_key
            )
        else:
            ssh.connect(
                server_data['ip'],
                username=server_data['username'],
                password=server_data['password']
            )
        return ssh
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH连接失败: {str(e)}")

# 更新命令执行函数
def execute_ssh_command(server_id: int, command: str):
    db = get_db()
    server = db.execute("SELECT * FROM servers WHERE id = ?", (server_id,)).fetchone()
    if not server:
        raise HTTPException(status_code=404, detail="服务器不存在")
    
    try:
        ssh = get_ssh_client(dict(server))
        stdin, stdout, stderr = ssh.exec_command(command)
        result = stdout.read().decode()
        error = stderr.read().decode()
        
        status = 'success' if not error else 'error'
        
        # 记录命令执行
        db.execute("""
            INSERT INTO command_logs (server_id, command, result, status)
            VALUES (?, ?, ?, ?)
        """, (server_id, command, result if not error else error, status))
        db.commit()
        
        ssh.close()
        return {"status": status, "result": result if not error else error}
    
    except Exception as e:
        error_msg = str(e)
        db.execute("""
            INSERT INTO command_logs (server_id, command, result, status)
            VALUES (?, ?, ?, ?)
        """, (server_id, command, error_msg, 'error'))
        db.commit()
        return {"status": "error", "result": error_msg}

# API路由
@app.get("/api/sites")
async def list_sites():
    db = get_db()
    sites = db.execute("SELECT * FROM sites").fetchall()
    return [dict(site) for site in sites]

@app.post("/api/sites")
async def create_site(site: Site):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO sites (domain, config_path, ssl_enabled) VALUES (?, ?, ?)",
        (site.domain, site.config_path, site.ssl_enabled)
    )
    db.commit()
    return {"message": "站点创建成功", "id": cursor.lastrowid}

@app.delete("/api/sites/{site_id}")
async def delete_site(site_id: int):
    db = get_db()
    db.execute("DELETE FROM sites WHERE id = ?", (site_id,))
    db.commit()
    return {"message": "站点删除成功"}

# 服务器相关API
@app.post("/api/servers")
async def create_server(server: Server):
    db = get_db()
    cursor = db.cursor()
    
    try:
        # 测试SSH连接
        ssh = get_ssh_client(server.dict())
        ssh.close()
        
        cursor.execute("""
            INSERT INTO servers (name, ip, username, auth_type, password, key_path)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            server.name,
            server.ip,
            server.username,
            server.auth_type,
            server.password if server.auth_type == 'password' else None,
            server.key_path if server.auth_type == 'key' else None
        ))
        db.commit()
        return {"message": "服务器添加成功", "id": cursor.lastrowid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加服务器失败: {str(e)}")

@app.get("/api/servers")
async def list_servers():
    db = get_db()
    servers = db.execute("SELECT id, name, ip, username, status FROM servers").fetchall()
    return [dict(server) for server in servers]

# 创建线程池用于执行同步操作
executor = ThreadPoolExecutor()

# 修改异步函数，使用线程池执行同步操作
async def execute_ssh_command_async(server_id: int, command: str) -> Dict[str, Any]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, execute_ssh_command, server_id, command)

@app.post("/api/servers/{server_id}/execute")
async def execute_command_endpoint(server_id: int, command: Command):
    return await execute_ssh_command_async(server_id, command.command)

@app.get("/api/servers/{server_id}/logs")
async def get_command_logs(server_id: int):
    db = get_db()
    logs = db.execute("""
        SELECT * FROM command_logs 
        WHERE server_id = ? 
        ORDER BY executed_at DESC
    """, (server_id,)).fetchall()
    return [dict(log) for log in logs]

# 添加SSH密钥上传接口
@app.post("/api/upload-key")
async def upload_ssh_key(file: UploadFile = File(...)):
    try:
        # 生成唯一文件名
        file_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(SSH_KEYS_DIR, file_name)
        
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 设置适当的文件权限
        os.chmod(file_path, 0o600)
        
        return {
            "message": "SSH密钥上传成功",
            "path": file_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

# 更新数据库schema
def update_servers_table():
    db = get_db()
    try:
        db.execute("""
            ALTER TABLE servers 
            ADD COLUMN auth_type TEXT DEFAULT 'password'
        """)
        db.execute("""
            ALTER TABLE servers 
            ADD COLUMN key_path TEXT
        """)
        db.commit()
    except:
        pass  # 列已存在

# 获取本机信息
def get_local_machine_info():
    try:
        import socket
        import getpass
        
        return {
            "name": socket.gethostname(),
            "ip": "127.0.0.1",  # 使用本地回环地址替代
            "username": getpass.getuser(),
            "auth_type": "password"
        }
    except Exception as e:
        print(f"获取本机信息出错: {str(e)}")
        return None

# 初始化数据库
def init_database():
    db = get_db()
    cursor = db.cursor()
    
    # 创建所有必需的表
    cursor.executescript("""
        -- 创建站点表
        CREATE TABLE IF NOT EXISTS sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            config_path TEXT,
            ssl_enabled BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 创建服务器表
        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ip TEXT NOT NULL,
            username TEXT NOT NULL,
            auth_type TEXT NOT NULL,
            status TEXT DEFAULT 'inactive'
        );

        -- 创建服务器监控数据表
        CREATE TABLE IF NOT EXISTS server_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id INTEGER,
            cpu_usage FLOAT,
            memory_usage FLOAT,
            disk_usage FLOAT,
            network_in FLOAT,
            network_out FLOAT,
            load_average TEXT,
            process_count INTEGER,
            uptime INTEGER,
            collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES servers (id)
        );

        -- 创建服务运行状态表
        CREATE TABLE IF NOT EXISTS service_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id INTEGER,
            service_name TEXT,
            status TEXT,
            port INTEGER,
            pid INTEGER,
            memory_usage FLOAT,
            cpu_usage FLOAT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES servers (id)
        );

        -- 创建监控记录表
        CREATE TABLE IF NOT EXISTS monitoring_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id INTEGER,
            status_code INTEGER,
            response_time FLOAT,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (site_id) REFERENCES sites (id)
        );

        -- 创建告警记录表
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id INTEGER,
            type TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT,
            FOREIGN KEY (site_id) REFERENCES sites (id)
        );
    """)
    db.commit()

    try:
        # 检查是否已有服务器数据
        servers = cursor.execute("SELECT COUNT(*) FROM servers").fetchone()[0]
        
        if servers == 0:
            # 获取本机信息并添加为第一个服务器
            try:
                local_info = get_local_machine_info()
                if local_info:
                    cursor.execute("""
                        INSERT INTO servers (name, ip, username, auth_type, status)
                        VALUES (?, ?, ?, ?, 'active')
                    """, (
                        local_info["name"],
                        local_info["ip"],
                        local_info["username"],
                        local_info["auth_type"]
                    ))
                    
                    # 添加系统信息到监控数据
                    cursor.execute("""
                        INSERT INTO server_metrics (
                            server_id, cpu_usage, memory_usage, disk_usage,
                            network_in, network_out, load_average, process_count, uptime
                        ) VALUES (?, 0, 0, 0, 0, 0, '0.0, 0.0, 0.0', 0, 0)
                    """, (cursor.lastrowid,))
                    
                    db.commit()
                    print("已添加本机作为初始服务器")
            except Exception as e:
                print(f"获取本机信息失败: {str(e)}")
                
    except Exception as e:
        print(f"初始化数据库失败: {str(e)}")

# 监控数据模型
class Metrics(BaseModel):
    server_id: int
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_in: float
    network_out: float
    load_average: str
    process_count: int
    uptime: int

class ServiceStatus(BaseModel):
    server_id: int
    service_name: str
    status: str
    port: int
    pid: int
    memory_usage: float
    cpu_usage: float

class SystemLog(BaseModel):
    server_id: int
    log_type: str
    message: str
    severity: str

# 监控相关API路由
@app.post("/api/monitor/metrics")
async def update_metrics(metrics: Metrics):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO server_metrics 
        (server_id, cpu_usage, memory_usage, disk_usage, network_in, 
         network_out, load_average, process_count, uptime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        metrics.server_id, metrics.cpu_usage, metrics.memory_usage,
        metrics.disk_usage, metrics.network_in, metrics.network_out,
        metrics.load_average, metrics.process_count, metrics.uptime
    ))
    db.commit()
    return {"message": "指标更新成功"}

@app.post("/api/monitor/services")
async def update_services(data: dict):
    db = get_db()
    cursor = db.cursor()
    for service in data['services']:
        cursor.execute("""
            INSERT INTO service_status 
            (server_id, service_name, status, port, pid, memory_usage, cpu_usage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            service['server_id'], service['service_name'], service['status'],
            service['port'], service['pid'], service['memory_usage'], 
            service['cpu_usage']
        ))
    db.commit()
    return {"message": "服务状态更新成功"}

@app.post("/api/monitor/logs")
async def update_logs(data: dict):
    db = get_db()
    cursor = db.cursor()
    for log in data['logs']:
        cursor.execute("""
            INSERT INTO system_logs 
            (server_id, log_type, message, severity)
            VALUES (?, ?, ?, ?)
        """, (
            log['server_id'], log['log_type'], 
            log['message'], log['severity']
        ))
    db.commit()
    return {"message": "系统日志更新成功"}

# 获取服务器监控数据
@app.get("/api/servers/{server_id}/metrics")
async def get_server_metrics(server_id: int):
    db = get_db()
    metrics = db.execute("""
        SELECT * FROM server_metrics 
        WHERE server_id = ? 
        ORDER BY collected_at DESC 
        LIMIT 100
    """, (server_id,)).fetchall()
    return [dict(metric) for metric in metrics]

@app.get("/api/servers/{server_id}/services")
async def get_server_services(server_id: int):
    db = get_db()
    services = db.execute("""
        SELECT * FROM service_status 
        WHERE server_id = ? 
        ORDER BY updated_at DESC
    """, (server_id,)).fetchall()
    return [dict(service) for service in services]

@app.get("/api/servers/{server_id}/logs")
async def get_server_logs(server_id: int):
    db = get_db()
    logs = db.execute("""
        SELECT * FROM system_logs 
        WHERE server_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1000
    """, (server_id,)).fetchall()
    return [dict(log) for log in logs]

# 添加新的状获取路由
@app.get("/api/servers/{server_id}/status")
async def get_server_status(server_id: int):
    try:
        # 这里可以根据server_id获取特定服务器的信息
        metrics = get_server_metrics()
        print(f"API返回的指标数据: {metrics}")  # 添加日志
        return metrics
    except Exception as e:
        print(f"获取服务器状态失败: {str(e)}")
        print(f"错误堆栈: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

def get_server_metrics():
    try:
        # 获取CPU使用率
        cpu_usage = psutil.cpu_percent(interval=1)
        print(f"CPU使用率: {cpu_usage}")
        
        # 获取内存使用情况
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        print(f"内存使用情况: {memory_usage}")
        
        # 获取磁盘使用情况
        disk = psutil.disk_usage('/')
        disk_usage = disk.percent
        print(f"磁盘使用情况: {disk_usage}")
        
        # 获取系统负载
        load_average = psutil.getloadavg()
        print(f"系统负载: {load_average}")
        
        # 获取网络IO统计
        net_io = psutil.net_io_counters()
        
        # 计算速率（与上次获取的差值）
        current_time = time.time()
        if hasattr(get_server_metrics, 'last_net_io'):
            time_delta = current_time - get_server_metrics.last_time
            rx_speed = (net_io.bytes_recv - get_server_metrics.last_net_io.bytes_recv) / time_delta
            tx_speed = (net_io.bytes_sent - get_server_metrics.last_net_io.bytes_sent) / time_delta
        else:
            rx_speed = 0
            tx_speed = 0

        # 保存本次数据用于下次计算
        get_server_metrics.last_net_io = net_io
        get_server_metrics.last_time = current_time

        network = {
            'rx_bytes': rx_speed,  # 当前接收速率
            'tx_bytes': tx_speed,  # 当前发送速率
            'rx_bytes_total': net_io.bytes_recv,  # 总接收量
            'tx_bytes_total': net_io.bytes_sent   # 总发送量
        }
        
        # 获取进程信息
        try:
            processes = {
                'total': len(psutil.pids()),
                'threads': sum(p.num_threads() for p in psutil.process_iter(['num_threads']))
            }
            print(f"进程信息: {processes}")
        except Exception as e:
            print(f"获取进程信息失败: {str(e)}")
            processes = {'total': 0, 'threads': 0}
        
        metrics = {
            'server_info': {
                'status': 'active'
            },
            'metrics': {
                'cpu_usage': round(cpu_usage, 2),
                'memory_usage': round(memory_usage, 2),
                'memory_total': round(memory.total / (1024 * 1024 * 1024), 2),
                'memory_used': round(memory.used / (1024 * 1024 * 1024), 2),
                'disk_usage': round(disk_usage, 2),
                'disk_total': round(disk.total / (1024 * 1024 * 1024), 2),
                'disk_used': round(disk.used / (1024 * 1024 * 1024), 2),
                'load_average': load_average,
                'network': network,
                'processes': processes,
                'timestamp': datetime.now().isoformat()
            }
        }
        print(f"返回的完整指标: {metrics}")
        return metrics
        
    except Exception as e:
        import traceback
        print(f"获取系统信息时出错: {str(e)}")
        print(f"错误堆栈: {traceback.format_exc()}")
        return {
            'server_info': {
                'status': 'error'
            },
            'metrics': {
                'cpu_usage': 0,
                'memory_usage': 0,
                'disk_usage': 0,
                'load_average': [0, 0, 0],
                'network': {
                    'rx_bytes': 0,
                    'tx_bytes': 0,
                    'rx_bytes_total': 0,
                    'tx_bytes_total': 0
                },
                'processes': {'total': 0, 'threads': 0}
            }
        }

# 修改 check_nginx 函数，添加更多错误处理和日志
def check_nginx():
    try:
        # 方法1：检查进程
        nginx_running = False
        for proc in psutil.process_iter(['name']):
            if proc.info['name'] == 'nginx':
                nginx_running = True
                break

        # 方法2：检查命令是否存在
        nginx_installed = os.system('which nginx >/dev/null 2>&1') == 0

        # 方法3：检查服务状态
        service_status = os.system('systemctl is-active --quiet nginx') == 0

        logger.info(f"Nginx 检查结果: installed={nginx_installed}, running={nginx_running}, service={service_status}")
        
        return nginx_installed and (nginx_running or service_status)
    except Exception as e:
        logger.error(f"检查 Nginx 状态时出错: {str(e)}")
        return False

# 修改 API 端点，添加更多信息
@app.get("/api/check-nginx")
async def check_nginx_status():
    try:
        nginx_installed = check_nginx()
        logger.info(f"Nginx 状态检查: {nginx_installed}")
        
        if nginx_installed:
            # 获取 Nginx 版本信息
            version = os.popen('nginx -v 2>&1').read().strip()
            return {
                "installed": True,
                "status": "running",
                "version": version,
                "message": "Nginx 已安装并运行"
            }
        else:
            return {
                "installed": False,
                "status": "not_installed",
                "message": "Nginx 未安装"
            }
    except Exception as e:
        logger.error(f"Nginx 状态检查失败: {str(e)}")
        return {
            "installed": False,
            "status": "error",
            "message": f"检查失败: {str(e)}"
        }

# 添加新的函数来检查和安装 Nginx
def install_nginx():
    try:
        # 检测系统类型
        if os.path.exists('/etc/debian_version'):  # Debian/Ubuntu
            os.system('sudo apt-get update')
            os.system('sudo apt-get install -y nginx')
        elif os.path.exists('/etc/redhat-release'):  # CentOS/RHEL
            os.system('sudo yum install -y epel-release')
            os.system('sudo yum install -y nginx')
        elif os.path.exists('/etc/arch-release'):  # Arch Linux
            os.system('sudo pacman -S --noconfirm nginx')
        else:
            return False, "不支持的操作系统"
        
        # 启动 Nginx 服务
        os.system('sudo systemctl start nginx')
        os.system('sudo systemctl enable nginx')
        
        return True, "Nginx 安装成功"
    except Exception as e:
        return False, str(e)

# 添加新的 API 端点
@app.post("/api/install-nginx")
async def install_nginx_service():
    success, message = install_nginx()
    if success:
        return {"status": "success", "message": message}
    else:
        raise HTTPException(status_code=500, detail=message)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001) 