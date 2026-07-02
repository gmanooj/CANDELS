import os
import pymysql
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

def autodetect_db():
    """
    Autodetects local MySQL Workbench credentials and SSL rules.
    Attempts local connection with root and either password, then falls back to Env URL.
    """
    # 1. Try password 'Manooj @12' (requires URL encoding %20 for spaces and %40 for @)
    try:
        conn = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='Manooj @12',
            database='teambridge_db',
            connect_timeout=2
        )
        conn.close()
        print("Connected to local database using password: 'Manooj @12'")
        return "mysql+pymysql://root:Manooj%20%4012@localhost:3306/teambridge_db", False
    except Exception:
        pass

    # 2. Try password 'Manooj@1921'
    try:
        conn = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='Manooj@1921',
            database='teambridge_db',
            connect_timeout=2
        )
        conn.close()
        print("Connected to local database using password: 'Manooj@1921'")
        return "mysql+pymysql://root:Manooj%401921@localhost:3306/teambridge_db", False
    except Exception:
        pass

    # 3. Fallback to DATABASE_URL in environment (typically Cloud DB)
    env_url = os.environ.get("DATABASE_URL")
    if env_url:
        print("Using Cloud database configuration.")
        return env_url.strip(), True

    # 4. Standard local fallback without password
    print("Could not connect to database with credentials. Using local default.")
    return "mysql+pymysql://root:@localhost/teambridge_db", False

db_uri, use_ssl = autodetect_db()

class Config:
    SQLALCHEMY_DATABASE_URI = db_uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "Manooj@19211921")

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 5,
        "max_overflow": 5,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
        "connect_args": {
            "connect_timeout": 10
        }
    }

# Inject SSL arguments only if using cloud database
if use_ssl:
    Config.SQLALCHEMY_ENGINE_OPTIONS["connect_args"]["ssl"] = {
        "ssl_cert_reqs": 0
    }