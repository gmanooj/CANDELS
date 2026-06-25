import os
from dotenv import load_dotenv

# Load variables from .env file into os.environ
load_dotenv()

class Config:
    # 3. Assemble the structural MySQL database access configuration string
    SQLALCHEMY_DATABASE_URI = (os.environ.get(
        "DATABASE_URL",
        "mysql+pymysql://root:@localhost/teambridge_db"
    ) or "").strip()

    # 4. Core tracking optimizations and application security keys
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback_secret_key")

    # 5. Connection pooling optimizations to handle concurrent websocket telemetry pipelines
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 5,
        "max_overflow": 5,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
        "connect_args": {
            "ssl": {
                "ssl_cert_reqs": 0
            },
            "connect_timeout": 10
        }
    }