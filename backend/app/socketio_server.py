import socketio

# Central Socket.IO server used by main and routers to avoid circular imports
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
    transports=['websocket', 'polling']
)

asgi_app = socketio.ASGIApp(sio)
