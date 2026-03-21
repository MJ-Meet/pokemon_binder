import time
import requests

def test_large_export():
    # 1. Create a 115 page binder
    payload = {
        "name": "hk",
        "grid_size": 3,
        "pages": 115,
        "color": "#e63946"
    }
    print("Creating massive binder...")
    # NOTE: I need to use the local FastAPI to test this. 
    # But uvicorn might not be running! Let's test with the python script directly importing the function.

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from database import SessionLocal
from main import export_binder_pdf
from models import Binder

def test():
    db = SessionLocal()
    b = db.query(Binder).filter(Binder.pages == 115).first()
    if not b:
        print("No 115 page binder found. Creating one...")
        b = Binder(name="hk", grid_size=3, pages=115, color="#e63946")
        db.add(b)
        db.commit()
        db.refresh(b)
    
    print(f"Exporting binder {b.id} with {b.pages} pages...")
    t0 = time.time()
    try:
        resp = export_binder_pdf(b.id, db)
        t1 = time.time()
        print(f"Export successful, size: {len(resp.body)}, time: {t1-t0:.2f}s")
    except Exception as e:
        print("Error:", repr(e))
        import traceback
        traceback.print_exc()

test()
