from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import sqlite3
from pydantic import BaseModel
from datetime import datetime
import os
import paramiko
from typing import Optional, Dict, Any, List
import shutil
import asyncio
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载前端静态文件
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# 根路由返回前端首页
@app.get("/")
async def read_root():
    return FileResponse("frontend/index.html")

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

# 启动时更新数据库结构
@app.on_event("startup")
async def startup_event():
    update_servers_table()

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

# WebSocket连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, server_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections[server_id] = websocket

    def disconnect(self, server_id: int) -> None:
        if server_id in self.active_connections:
            del self.active_connections[server_id]

    async def send_message(self, server_id: int, message: Dict[str, Any]) -> None:
        if server_id in self.active_connections:
            try:
                await self.active_connections[server_id].send_json(message)
            except Exception:
                await self.disconnect(server_id)

manager = ConnectionManager()

# WebSocket路由
@app.websocket("/ws/{server_id}")
async def websocket_endpoint(websocket: WebSocket, server_id: int):
    await manager.connect(server_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # 处理接收到的监控数据
            if data.get('type') == 'metrics':
                await update_metrics(Metrics(**data['data']))
            elif data.get('type') == 'services':
                await update_services(data['data'])
            elif data.get('type') == 'logs':
                await update_logs(data['data'])
            
            # 广播数据给所有订阅该服务器的客户端
            await manager.send_message(server_id, {
                'type': 'update',
                'data': data
            })
    except WebSocketDisconnect:
        manager.disconnect(server_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001) 