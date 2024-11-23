from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Any, Optional
import asyncio
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.connection_locks: Dict[int, asyncio.Lock] = {}
        self.retry_intervals = [1, 2, 5, 10, 30]  # 重试间隔（秒）

    async def connect(self, server_id: int, websocket: WebSocket) -> None:
        try:
            await websocket.accept()
            self.active_connections[server_id] = websocket
            self.connection_locks[server_id] = asyncio.Lock()
            logger.info(f"WebSocket connected for server {server_id}")
        except Exception as e:
            logger.error(f"WebSocket connection failed for server {server_id}: {str(e)}")
            raise

    async def disconnect(self, server_id: int) -> None:
        if server_id in self.active_connections:
            try:
                await self.active_connections[server_id].close()
            except Exception:
                pass
            del self.active_connections[server_id]
            if server_id in self.connection_locks:
                del self.connection_locks[server_id]
            logger.info(f"WebSocket disconnected for server {server_id}")

    async def send_message(self, server_id: int, message: Dict[str, Any]) -> bool:
        if server_id not in self.active_connections:
            return False

        lock = self.connection_locks.get(server_id)
        if not lock:
            return False

        async with lock:
            try:
                await self.active_connections[server_id].send_json({
                    **message,
                    'timestamp': datetime.now().isoformat()
                })
                return True
            except Exception as e:
                logger.error(f"Failed to send message to server {server_id}: {str(e)}")
                await self.disconnect(server_id)
                return False

    async def broadcast(self, message: Dict[str, Any]) -> None:
        disconnected_servers = []
        for server_id in self.active_connections:
            if not await self.send_message(server_id, message):
                disconnected_servers.append(server_id)
        
        # 清理断开的连接
        for server_id in disconnected_servers:
            await self.disconnect(server_id)

    async def handle_connection(self, server_id: int, websocket: WebSocket) -> None:
        await self.connect(server_id, websocket)
        try:
            while True:
                try:
                    data = await websocket.receive_json()
                    # 处理接收到的数据
                    await self.handle_message(server_id, data)
                except WebSocketDisconnect:
                    logger.info(f"WebSocket disconnected for server {server_id}")
                    break
                except Exception as e:
                    logger.error(f"Error handling WebSocket message: {str(e)}")
                    break
        finally:
            await self.disconnect(server_id)

    async def handle_message(self, server_id: int, message: Dict[str, Any]) -> None:
        try:
            # 根据消息类型处理不同的逻辑
            message_type = message.get('type')
            if message_type == 'metrics':
                await self.handle_metrics(server_id, message['data'])
            elif message_type == 'logs':
                await self.handle_logs(server_id, message['data'])
            elif message_type == 'error':
                await self.handle_error(server_id, message['data'])
        except Exception as e:
            logger.error(f"Error processing message from server {server_id}: {str(e)}")

    async def handle_metrics(self, server_id: int, data: Dict[str, Any]) -> None:
        # 处理监控指标数据
        pass

    async def handle_logs(self, server_id: int, data: Dict[str, Any]) -> None:
        # 处理日志数据
        pass

    async def handle_error(self, server_id: int, data: Dict[str, Any]) -> None:
        # 处理错误信息
        logger.error(f"Error from server {server_id}: {data}") 