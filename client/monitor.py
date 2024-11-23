from __future__ import annotations
from typing import Dict, Any, Optional
try:
    from typing import Literal
except ImportError:
    from typing_extensions import Literal

import websockets
import asyncio
import json
import logging
from datetime import datetime
import socket

class ServerMonitor:
    def __init__(self, ws_url: str, server_id: int, interval: int = 60) -> None:
        self.ws_url = ws_url
        self.server_id = server_id
        self.interval = interval
        self.hostname = socket.gethostname()
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        self.websocket = None
        self._lock = asyncio.Lock()

    async def connect(self) -> bool:
        try:
            self.websocket = await websockets.connect(
                f"{self.ws_url}/{self.server_id}",
                max_size=None  # 避免消息大小限制问题
            )
            self.logger.info(f"WebSocket连接成功: {self.ws_url}")
            return True
        except Exception as e:
            self.logger.error(f"WebSocket连接失败: {str(e)}")
            return False

    async def send_data(self, data_type: str, data: Dict[str, Any]) -> bool:
        if not self.websocket:
            if not await self.connect():
                return False
        
        try:
            message = {
                'type': data_type,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
            await self.websocket.send(json.dumps(message))
            return True
        except Exception as e:
            self.logger.error(f"发送数据失败: {str(e)}")
            self.websocket = None
            return False

    async def run(self) -> None:
        self.logger.info(f"开始监控服务器 {self.hostname}")
        
        while True:
            try:
                async with self._lock:
                    await self._collect_and_send_data()
            except Exception as e:
                self.logger.error(f"监控循环发生错误: {str(e)}")
                if self.websocket:
                    await self.websocket.close()
                    self.websocket = None
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
    # 使用兼容的方式运行事件循环
    loop = asyncio.get_event_loop()
    try:
        monitor = ServerMonitor("ws://your-server:9001/ws", 1)
        loop.run_until_complete(monitor.run())
    except KeyboardInterrupt:
        pass
    finally:
        loop.close() 