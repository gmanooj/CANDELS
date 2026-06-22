import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")

try:
    print(f"Attempting to connect to: {db_url}")
    # Force PyMySQL to use SSL without verifying the CA certificate explicitly to bypass the 'Lost Connection' Aiven error
    engine = create_engine(db_url, connect_args={'ssl': {'ssl_cert_reqs': 0}})
    with engine.connect() as conn:
        print("Successfully connected to the Aiven database!")
except Exception as e:
    print(f"Connection failed: {e}")
