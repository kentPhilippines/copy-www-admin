from typing import Dict, Any, Optional
import sqlite3
from contextlib import contextmanager
import paramiko
import json
from datetime import datetime

class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path

    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def execute(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return cursor.lastrowid

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None

    def fetch_all(self, query: str, params: tuple = ()) -> list[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows] 

class ServerMetrics:
    def __init__(self, host, username, password=None, key_path=None):
        self.host = host
        self.username = username
        self.password = password
        self.key_path = key_path
        
    def get_metrics(self):
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            if self.key_path:
                key = paramiko.RSAKey.from_private_key_file(self.key_path)
                ssh.connect(self.host, username=self.username, pkey=key)
            else:
                ssh.connect(self.host, username=self.username, password=self.password)
            
            # 执行命令获取系统信息
            commands = {
                'cpu': "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'",
                'memory': "free | grep Mem | awk '{print $3/$2 * 100.0}'",
                'disk': "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'",
                'load': "cat /proc/loadavg",
                'network': "cat /proc/net/dev | grep eth0",
                'processes': "ps aux | wc -l; ps -eLf | wc -l"
            }
            
            metrics = {}
            for key, cmd in commands.items():
                stdin, stdout, stderr = ssh.exec_command(cmd)
                metrics[key] = stdout.read().decode().strip()
            
            # 解析网络数据
            network_data = metrics['network'].split()
            rx_bytes = int(network_data[1])
            tx_bytes = int(network_data[9])
            
            # 解析进程数据
            processes_data = metrics['processes'].split('\n')
            total_processes = int(processes_data[0]) - 1  # 减去header
            total_threads = int(processes_data[1]) - 1
            
            return {
                'metrics': {
                    'cpu_usage': float(metrics['cpu']),
                    'memory_usage': float(metrics['memory']),
                    'disk_usage': float(metrics['disk']),
                    'load_average': [float(x) for x in metrics['load'].split()[:3]],
                    'network': {
                        'rx_bytes': rx_bytes,
                        'tx_bytes': tx_bytes
                    },
                    'processes': {
                        'total': total_processes,
                        'threads': total_threads
                    },
                    'timestamp': datetime.now().isoformat()
                }
            }
            
        finally:
            ssh.close() 