from fastapi import APIRouter, HTTPException
from typing import Callable, Any
import functools
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor()

def async_route(func: Callable) -> Callable:
    """装饰器：将同步操作转换为异步操作"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(executor, functools.partial(func, *args, **kwargs))
    return wrapper

class BaseRouter:
    def __init__(self):
        self.router = APIRouter()
        self.setup_routes()

    def setup_routes(self):
        pass

    def handle_error(self, func: Callable) -> Callable:
        """错误处理装饰器"""
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        return wrapper 