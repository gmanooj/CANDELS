import os

class Config:
    # 🔒 Ensure your secret key matches your system tokens
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your_jwt_secret_signing_key')
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your_jwt_secret_signing_key")
    
    # 🌍 BIND DIRECTLY TO AIVEN HOST PIPELINE
    # Format: mysql+pymysql://<user>:<password>@<host>:<port>/<dbname>
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'mysql+pymysql://avnadmin:<password>@mysql-fd9436f-candels.h.aivencloud.com:26518/defaultdb'
    )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False