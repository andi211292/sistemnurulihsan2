import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def test_cloud_connection():
    env_path = os.path.join(os.path.dirname(__file__), "backend", ".env")
    print(f"Loading .env from {env_path}")
    
    url = ""
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith("CLOUD_DATABASE_URL="):
                    url = line.split('=', 1)[1].strip().strip('"').strip("'")
    
    if not url:
        print("CLOUD_DATABASE_URL not found in .env")
        return

    print(f"Testing connection to: {url[:30]}...")
    try:
        engine = create_engine(url, connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            print("SUCCESS: Connected to Cloud Database!")
    except Exception as e:
        print(f"FAILURE: Could not connect to Cloud Database: {e}")

if __name__ == "__main__":
    test_cloud_connection()
