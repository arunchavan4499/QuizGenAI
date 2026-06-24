from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from db.config import db_url, settings


# Configure engine based on database type
engine_kwargs = {}
if "sqlite" in db_url:
    engine_kwargs = {"connect_args": {"check_same_thread": False}}
else:
    engine_kwargs = {"pool_pre_ping": True}

engine = create_engine(url=db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
