import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL", "")

# We only create the cloud engine if the URL is provided
if CLOUD_DATABASE_URL:
    try:
        cloud_engine = create_engine(CLOUD_DATABASE_URL)
        CloudSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cloud_engine)
    except Exception as e:
        print(f"Warning: Failed to initialize cloud database engine: {e}")
        cloud_engine = None
        CloudSessionLocal = None
else:
    cloud_engine = None
    CloudSessionLocal = None

CloudBase = declarative_base()
