import websockets
import asyncio
import json
import logging
from datetime import datetime

class ServerMonitor:
    def __init__(self, ws_url, server_id, interval=60):
        self.ws_url = ws_url
        self.server_id = server_id
        self.interval = interval
        self.hostname = socket.gethostname()
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # WebSocket连接
        self.websocket = None

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
        self.logger.info(f"开始监控服务器 {self.hostname}")
        
        while True:
            try:
                # 收集系统指标
                metrics = self.get_system_metrics()
                if metrics:
                    await self.send_data('metrics', metrics)

                # 收集服务状态
                services = self.get_service_status()
                if services:
                    await self.send_data('services', {'services': services})

                # 收集系统日志
                logs = self.collect_system_logs()
                if logs:
                    await self.send_data('logs', {'logs': logs})

            except Exception as e:
                self.logger.error(f"监控循环发生错误: {str(e)}")
                # 尝试重新连接
                self.websocket = None
                await asyncio.sleep(5)

            await asyncio.sleep(self.interval)

    # 其他方法保持不变...

if __name__ == "__main__":
    # 配置信息应该从配置文件读取
    WS_URL = "ws://your-server:9001/ws"
    SERVER_ID = 1  # 这个ID应该是在服务器注册时获得的
    
    monitor = ServerMonitor(WS_URL, SERVER_ID)
    
    # 使用asyncio运行
    asyncio.get_event_loop().run_until_complete(monitor.run()) 