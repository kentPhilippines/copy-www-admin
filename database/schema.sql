-- 站点表
CREATE TABLE sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    status TEXT DEFAULT 'inactive',
    ssl_enabled INTEGER DEFAULT 0,
    config_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 服务器表
CREATE TABLE servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    username TEXT NOT NULL,
    auth_type TEXT DEFAULT 'password',
    password TEXT,
    key_path TEXT,
    status TEXT DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 命令执行记录表
CREATE TABLE command_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER,
    command TEXT NOT NULL,
    result TEXT,
    status TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers (id)
);

-- SSL证书表
CREATE TABLE certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    domain TEXT NOT NULL,
    expires_at TIMESTAMP,
    cert_path TEXT,
    key_path TEXT,
    FOREIGN KEY (site_id) REFERENCES sites (id)
);

-- 监控记录表
CREATE TABLE monitoring_logs (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id),
    status_code INTEGER,
    response_time FLOAT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 告警记录表
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id),
    type VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50)
);

-- 添加服务器监控数据表
CREATE TABLE server_metrics (
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

-- 添加服务运行状态表
CREATE TABLE service_status (
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

-- 添加系统日志表
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER,
    log_type TEXT,
    message TEXT,
    severity TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers (id)
); 