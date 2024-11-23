import websockets
import asyncio
import json
import logging
from datetime import datetime
import socket

# 添加兼容性导入
try:
    from typing import Dict, Any
except ImportError:
    Dict = dict
    Any = object

class ServerMonitor:
    def __init__(self, ws_url: str, server_id: int, interval: int = 60):
        self.ws_url = ws_url
        self.server_id = server_id
        self.interval = interval
        self.hostname = socket.gethostname()
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        self.websocket = None
        self._lock = asyncio.Lock()  # 添加锁以确保线程安全

    async def connect(self):
        try:
            self.websocket = await websockets.connect(
                f"{self.ws_url}/{self.server_id}"
            )
            self.logger.info(f"WebSocket连接成功: {self.ws_url}")
            return True
        except Exception as e:
            self.logger.error(f"WebSocket连接失败: {str(e)}")
            return False

    async def send_data(self, data_type: str, data: dict):
        if not self.websocket:
            if not await self.connect():
                return False
        
        try:
            await self.websocket.send(json.dumps({
                'type': data_type,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }))
            return True
        except Exception as e:
            self.logger.error(f"发送数据失败: {str(e)}")
            self.websocket = None  # 重置连接
            return False

    async def run(self):
        while True:
            try:
                async with self._lock:
                    # 收集并发送数据
                    await self._collect_and_send_data()
            except Exception as e:
                self.logger.error(f"监控循环发生错误: {str(e)}")
                await asyncio.sleep(5)
            
            await asyncio.sleep(self.interval)

    async def _collect_and_send_data(self):
        # 将数据收集和发送逻辑封装在一个方法中
        metrics = self.get_system_metrics()
        if metrics:
            await self.send_data('metrics', metrics)

        services = self.get_service_status()
        if services:
            await self.send_data('services', {'services': services})

        logs = self.collect_system_logs()
        if logs:
            await self.send_data('logs', {'logs': logs})

    # 其他方法保持不变...

if __name__ == "__main__":
    # 配置信息应该从配置文件读取
    WS_URL = "ws://your-server:9001/ws"
    SERVER_ID = 1  # 这个ID应该是在服务器注册时获得的
    
    monitor = ServerMonitor(WS_URL, SERVER_ID)
    
    # 使用asyncio运行
    asyncio.get_event_loop().run_until_complete(monitor.run()) 