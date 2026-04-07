# ===========================
# FASTAPI  —  port 8000
# ===========================

import os
import time
import base64
import cv2
import face_recognition
import numpy as np
import requests
import smtplib
import random

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from email.message import EmailMessage
from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, text, Table, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base

# ===========================
# APP INIT
# ===========================

app = FastAPI()

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_DIR = BASE_DIR
FACES_DIR     = os.path.join(DASHBOARD_DIR, "faces")
INTRUDER_DIR  = os.path.join(BASE_DIR, "intruders")

os.makedirs(FACES_DIR,    exist_ok=True)
os.makedirs(INTRUDER_DIR, exist_ok=True)

app.mount("/intruders", StaticFiles(directory=INTRUDER_DIR), name="intruders")
app.mount("/faces",     StaticFiles(directory=FACES_DIR),    name="faces")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Frame(BaseModel):
    image:      str
    user_email: Optional[str] = ""


# ===========================
# DATABASE
# ===========================

DATABASE_URL = f"sqlite:///{DASHBOARD_DIR}/faias.db"
engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()


class UserRequest(Base):
    __tablename__ = "user_requests"
    request_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id    = Column(Integer)
    action     = Column(String)
    name       = Column(String)
    unique_id  = Column(String)
    image_path = Column(String)
    status     = Column(String)
    created_at = Column(String)


class AuthorizedPerson(Base):
    __tablename__ = "authorized_persons"
    id         = Column("id",        Integer, primary_key=True, autoincrement=True)
    person_id  = Column("person_id", Integer)
    name       = Column(String)
    unique_id  = Column(String)
    image_path = Column(String)
    added_by   = Column(String)
    date_added = Column(String)
    email      = Column(String)
    contact    = Column(String)
    address    = Column(String)


metadata    = MetaData()
users_table = Table(
    "users", metadata,
    Column("user_id",       Integer, primary_key=True),
    Column("name",          String),
    Column("email",         String),
    Column("password_hash", String),
    Column("created_at",    String),
    Column("role",          String),
    extend_existing=True,
)


def ensure_columns():
    needed = [
        ("person_id",  "INTEGER"),
        ("unique_id",  "TEXT"),
        ("added_by",   "TEXT"),
        ("date_added", "TEXT"),
        ("email",      "TEXT"),
        ("contact",    "TEXT"),
        ("address",    "TEXT"),
    ]
    with engine.connect() as conn:
        existing = [
            row[1] for row in conn.execute(text("PRAGMA table_info(authorized_persons)"))
        ]
        for col, col_type in needed:
            if col not in existing:
                conn.execute(text(f"ALTER TABLE authorized_persons ADD COLUMN {col} {col_type}"))
                conn.commit()
                print(f"  [DB] Added column: {col}")


ensure_columns()


def insert_authorized_person(
    name: str,
    unique_id: str,
    image_path: str,
    added_by: str,
    date_added: str,
    email: str = "",
    contact: str = "",
    address: str = "",
) -> int:
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                INSERT INTO authorized_persons
                    (name, unique_id, image_path, added_by, date_added, email, contact, address)
                VALUES
                    (:name, :unique_id, :image_path, :added_by, :date_added,
                     :email, :contact, :address)
            """),
            {
                "name":       name,
                "unique_id":  unique_id,
                "image_path": image_path,
                "added_by":   added_by,
                "date_added": date_added,
                "email":      email    or "",
                "contact":    contact  or "",
                "address":    address  or "",
            },
        )
        row_id = result.lastrowid
        conn.execute(
            text("UPDATE authorized_persons SET person_id = :pid WHERE id = :rid"),
            {"pid": row_id, "rid": row_id},
        )

    print(f"  [DB] Inserted: id={row_id}, person_id={row_id}, name='{name}'")
    return row_id


# ===========================
# IN-MEMORY FACE ENCODINGS
# ===========================

known_encodings: list = []
known_names:     list = []
known_ids:       list = []


def reload_encodings_from_db():
    global known_encodings, known_names, known_ids

    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, name, image_path
                FROM   authorized_persons
                WHERE  name IS NOT NULL AND image_path IS NOT NULL
            """)
        ).fetchall()

    new_enc, new_names, new_ids = [], [], []
    for row_id, name, image_path in rows:
        if not image_path or not os.path.exists(image_path):
            print(f"  [reload] Missing image for '{name}': {image_path}")
            continue
        try:
            img  = face_recognition.load_image_file(image_path)
            encs = face_recognition.face_encodings(img)
            if encs:
                new_enc.append(encs[0])
                new_names.append(name)
                new_ids.append(row_id)
                print(f"  [reload] Encoded: '{name}' (id={row_id})")
            else:
                print(f"  [reload] No face in image for: '{name}'")
        except Exception as e:
            print(f"  [reload] Error for '{name}': {e}")

    known_encodings = new_enc
    known_names     = new_names
    known_ids       = new_ids
    print(f"[reload] Done — {len(known_encodings)} encoding(s) in memory")


print("=" * 50)
print("Loading face encodings from DB on startup...")
reload_encodings_from_db()
print("=" * 50)


# ===========================
# OTP STORE
# ===========================

otp_store:         dict = {}
OTP_EXPIRY_SECONDS      = 300   # 5 minutes


# ===========================
# EMAIL SETTINGS
# ===========================

SENDER_EMAIL    = "aurasecure01@gmail.com"       # sends ALL emails
APP_PASSWORD    = "xube ofvm zxnr wmhe"           # aurasecure01 app password
ALERT_RECIPIENT = "vishakhateotia70@gmail.com"    # always receives intruder alerts
ALERT_COOLDOWN  = 60
last_alert_time = 0


def send_otp_email(to_email: str, otp: str):
    """Send OTP from aurasecure01 to the registering user."""
    msg            = EmailMessage()
    msg["From"]    = SENDER_EMAIL
    msg["To"]      = to_email
    msg["Subject"] = "AURA Secure — Your OTP Code"
    msg.set_content(
        f"Hello,\n\n"
        f"Your One-Time Password (OTP) for AURA Secure registration is:\n\n"
        f"  {otp}\n\n"
        f"This code expires in 5 minutes. Do not share it with anyone.\n\n"
        f"— AURA Secure System"
    )
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)
            print(f"✅ OTP sent to {to_email}")
    except Exception as e:
        print(f"❌ OTP email error: {e}")
        raise HTTPException(500, f"Failed to send OTP email: {e}")


def send_email_alert(image_path: str):
    """
    Send intruder alert + snapshot from aurasecure01
    to vishakhateotia70@gmail.com (ALERT_RECIPIENT).
    Respects ALERT_COOLDOWN to avoid flooding.
    """
    global last_alert_time
    now = time.time()
    if now - last_alert_time < ALERT_COOLDOWN:
        return
    last_alert_time = now

    try:
        with open(image_path, "rb") as f:
            image_data = f.read()
        image_filename = os.path.basename(image_path)
    except Exception as e:
        print(f"[email] Could not read snapshot: {e}")
        return

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        msg            = EmailMessage()
        msg["From"]    = SENDER_EMAIL       # aurasecure01@gmail.com
        msg["To"]      = ALERT_RECIPIENT    # vishakhateotia70@gmail.com
        msg["Subject"] = "⚠️ AURA Secure — Intruder Alert"
        msg.set_content(
            f"Hello,\n\n"
            f"An unauthorized person was detected by AURA Secure.\n\n"
            f"  Time   : {timestamp}\n"
            f"  Camera : CAM-01 (Main Entrance)\n"
            f"  Status : UNAUTHORIZED ACCESS ATTEMPT\n\n"
            f"The intruder snapshot is attached to this email.\n\n"
            
            f"— AURA Secure System"
        )
        msg.add_attachment(
            image_data,
            maintype="image",
            subtype="jpeg",
            filename=image_filename,
        )
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)
        print(f"✅ Alert sent: {SENDER_EMAIL} → {ALERT_RECIPIENT}")
    except Exception as e:
        print(f"❌ Alert email error: {e}")


# ===========================
# HELPERS
# ===========================

intruder_captured     = False
last_intrusion_time   = 0.0
INTRUSION_COOLDOWN    = 15
INTRUSION_RESET_DELAY = 5


def save_intruder_snapshot(image) -> str:
    filename = f"intruder_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    filepath = os.path.join(INTRUDER_DIR, filename)
    cv2.imwrite(filepath, image)
    print(f"[snapshot] Saved: {filepath}")
    return filepath


def log_scan(confidence: float, notified: int, alert_type: str):
    try:
        requests.post(
            "http://localhost:5001/api/alert",
            json={"confidence": confidence, "notified": notified, "type": alert_type},
            timeout=2,
        )
    except Exception:
        pass


def image_to_data_uri(image_path: str) -> str:
    if not image_path or not os.path.exists(image_path):
        return ""
    ext  = os.path.splitext(image_path)[1].lower().lstrip(".")
    mime = "jpeg" if ext in ("jpg", "jpeg") else ext
    with open(image_path, "rb") as f:
        return f"data:image/{mime};base64,{base64.b64encode(f.read()).decode()}"


def save_upload_to_faces(upload: UploadFile, name: str, content: bytes) -> str:
    ext      = os.path.splitext(upload.filename)[1] if upload.filename else ".jpg"
    filename = f"{name.strip().replace(' ', '_')}_{int(time.time())}{ext}"
    filepath = os.path.join(FACES_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    return filepath


def get_face_encodings_from_file(filepath: str) -> list:
    try:
        img  = face_recognition.load_image_file(filepath)
        encs = face_recognition.face_encodings(img)
    except Exception:
        if os.path.exists(filepath): os.remove(filepath)
        raise HTTPException(400, "Could not read image file")
    if not encs:
        if os.path.exists(filepath): os.remove(filepath)
        raise HTTPException(400, "No face detected. Please use a clear front-facing photo.")
    return encs


# ===========================
# ROUTES
# ===========================

@app.get("/")
def root():
    return {"status": "FAIAS main.py running on port 8000"}


# ── SEND OTP ───────────────────────────────────────────────────────────────────

@app.post("/api/send-otp")
def send_otp(data: dict):
    email = data.get("email", "").strip()
    if not email:
        raise HTTPException(400, "Email is required")

    with engine.connect() as conn:
        existing = conn.execute(
            users_table.select().where(users_table.c.email == email)
        ).fetchone()
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    otp = str(random.randint(100000, 999999))
    otp_store[email] = {
        "otp":        otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
    }

    print(f"[OTP] Generated for {email}: {otp}")
    send_otp_email(email, otp)
    return {"status": "OTP sent to your email"}


# ── SIGNUP ─────────────────────────────────────────────────────────────────────

@app.post("/api/signup")
def signup(data: dict):
    email    = data.get("email",    "").strip()
    password = data.get("password", "").strip()
    otp      = data.get("otp",      "").strip()

    if not email or not password or not otp:
        raise HTTPException(400, "Email, password and OTP are all required")

    stored = otp_store.get(email)
    if not stored:
        raise HTTPException(400, "No OTP found for this email. Please request a new one.")
    if time.time() > stored["expires_at"]:
        otp_store.pop(email, None)
        raise HTTPException(400, "OTP has expired. Please request a new one.")
    if stored["otp"] != otp:
        raise HTTPException(400, "Invalid OTP. Please check your email and try again.")

    with engine.begin() as conn:
        conn.execute(
            users_table.insert().values(
                name          = email.split("@")[0],
                email         = email,
                password_hash = password,
                created_at    = str(datetime.now()),
                role          = "user",
            )
        )

    otp_store.pop(email, None)
    print(f"[signup] New user registered: {email}")
    return {"message": "User registered successfully"}


# ── LOGIN ──────────────────────────────────────────────────────────────────────

@app.post("/api/login")
def login(data: dict):
    email    = data.get("email",    "").strip()
    password = data.get("password", "").strip()

    if email == "admin@gmail.com" and password == "admin123":
        return {"status": "login success", "role": "admin"}

    with engine.connect() as conn:
        result = conn.execute(
            users_table.select().where(
                (users_table.c.email         == email) &
                (users_table.c.password_hash == password)
            )
        ).fetchone()

    if result:
        return {"status": "login success", "role": "user"}

    return {"status": "fail", "message": "Invalid email or password"}


# ── RELOAD ENCODINGS ───────────────────────────────────────────────────────────

@app.post("/api/reload-encodings")
def api_reload_encodings():
    try:
        reload_encodings_from_db()
        return {"status": "ok", "total": len(known_encodings)}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── DEBUG SCHEMA ───────────────────────────────────────────────────────────────

@app.get("/debug/schema")
def debug_schema():
    with engine.connect() as conn:
        ap     = [{"cid": r[0], "name": r[1], "type": r[2]}
                  for r in conn.execute(text("PRAGMA table_info(authorized_persons)"))]
        ur     = [{"cid": r[0], "name": r[1], "type": r[2]}
                  for r in conn.execute(text("PRAGMA table_info(user_requests)"))]
        sample = conn.execute(
            text("SELECT id, person_id, name, unique_id FROM authorized_persons LIMIT 5")
        ).fetchall()
    return {
        "authorized_persons_columns": ap,
        "user_requests_columns":      ur,
        "sample_rows":                [dict(zip(["id","person_id","name","unique_id"], r)) for r in sample],
        "known_names_in_memory":      known_names,
        "known_ids_in_memory":        known_ids,
    }


# ── GET AUTHORIZED PERSONS ─────────────────────────────────────────────────────

@app.get("/api/authorized")
def get_authorized():
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, person_id, name, unique_id, image_path,
                       added_by, date_added, email, contact, address
                FROM   authorized_persons
                WHERE  name IS NOT NULL
                ORDER  BY id
            """)
        ).fetchall()

    return [
        {
            "person_id":  r[1] if r[1] is not None else r[0],
            "name":       r[2]  or "",
            "unique_id":  r[3]  or "",
            "image_path": r[4]  or "",
            "image":      image_to_data_uri(r[4]),
            "added_by":   r[5]  or "",
            "date_added": r[6]  or "",
            "email":      r[7]  or "",
            "contact":    r[8]  or "",
            "address":    r[9]  or "",
        }
        for r in rows
    ]


# ── ADD AUTHORIZED USER (admin direct) ────────────────────────────────────────

@app.post("/add-user")
async def add_user(
    name:    str        = Form(...),
    image:   UploadFile = File(...),
    email:   str        = Form(""),
    contact: str        = Form(""),
    address: str        = Form(""),
):
    if not name.strip():
        raise HTTPException(400, "Name is required")

    content    = await image.read()
    image_path = save_upload_to_faces(image, name, content)
    encs       = get_face_encodings_from_file(image_path)

    unique_id = f"UID_{int(time.time())}"
    row_id    = insert_authorized_person(
        name       = name.strip(),
        unique_id  = unique_id,
        image_path = image_path,
        added_by   = "admin",
        date_added = str(datetime.now()),
        email      = email.strip(),
        contact    = contact.strip(),
        address    = address.strip(),
    )

    known_encodings.append(encs[0])
    known_names.append(name.strip())
    known_ids.append(row_id)
    print(f"[add-user] '{name.strip()}' in memory (id={row_id}). Total: {len(known_encodings)}")

    return {"status": "User added", "person_id": row_id, "unique_id": unique_id}


# ── UPDATE AUTHORIZED USER ─────────────────────────────────────────────────────

@app.put("/api/authorized/{person_id}")
async def update_authorized_user(
    person_id: int,
    name:    str               = Form(...),
    image:   UploadFile | None = File(None),
    email:   str               = Form(""),
    contact: str               = Form(""),
    address: str               = Form(""),
):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, image_path FROM authorized_persons WHERE id = :pid OR person_id = :pid"),
            {"pid": person_id},
        ).fetchone()

    if not row:
        raise HTTPException(404, "User not found")

    real_id        = row[0]
    old_image_path = row[1]
    new_image_path = old_image_path

    if image and image.filename:
        if old_image_path and os.path.exists(old_image_path):
            os.remove(old_image_path)
        content        = await image.read()
        new_image_path = save_upload_to_faces(image, name, content)
        encs           = get_face_encodings_from_file(new_image_path)
        if real_id in known_ids:
            idx = known_ids.index(real_id)
            known_encodings[idx] = encs[0]
            known_names[idx]     = name.strip()
        else:
            known_encodings.append(encs[0])
            known_names.append(name.strip())
            known_ids.append(real_id)
    else:
        if real_id in known_ids:
            known_names[known_ids.index(real_id)] = name.strip()

    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE authorized_persons
                SET    name=:name, image_path=:image_path,
                       email=:email, contact=:contact, address=:address
                WHERE  id=:rid
            """),
            {
                "name":       name.strip(),
                "image_path": new_image_path,
                "email":      email.strip()   or "",
                "contact":    contact.strip() or "",
                "address":    address.strip() or "",
                "rid":        real_id,
            },
        )

    return {"status": "User updated"}


# ── DELETE AUTHORIZED USER ─────────────────────────────────────────────────────

@app.delete("/api/authorized/{person_id}")
def delete_authorized_user(person_id: int):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, image_path FROM authorized_persons WHERE id = :pid OR person_id = :pid"),
            {"pid": person_id},
        ).fetchone()

    if not row:
        raise HTTPException(404, "User not found")

    real_id    = row[0]
    image_path = row[1]

    if image_path and os.path.exists(image_path):
        os.remove(image_path)

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM authorized_persons WHERE id = :rid"), {"rid": real_id})

    if real_id in known_ids:
        idx = known_ids.index(real_id)
        known_encodings.pop(idx)
        known_names.pop(idx)
        known_ids.pop(idx)
        print(f"[delete] Removed encoding for id={real_id}")

    return {"status": "User deleted"}


# ── USER: SUBMIT ACCESS REQUEST ────────────────────────────────────────────────

@app.post("/api/request-access")
async def request_access(name: str = Form(...), image: UploadFile = File(...)):
    if not name.strip():
        raise HTTPException(400, "Name is required")

    db = SessionLocal()
    try:
        content  = await image.read()
        filepath = save_upload_to_faces(image, name, content)

        try:
            img_data = face_recognition.load_image_file(filepath)
            encs     = face_recognition.face_encodings(img_data)
        except Exception:
            if os.path.exists(filepath): os.remove(filepath)
            raise HTTPException(400, "Could not read image")

        if not encs:
            if os.path.exists(filepath): os.remove(filepath)
            raise HTTPException(400, "No face detected. Please use a clear front-facing photo.")

        db.add(UserRequest(
            user_id    = 1,
            action     = "ADD",
            name       = name.strip(),
            unique_id  = f"UID_{int(time.time())}",
            image_path = filepath,
            status     = "pending",
            created_at = str(datetime.now()),
        ))
        db.commit()
        print(f"[request-access] Stored: '{name.strip()}' → {filepath}")
        return {"message": "Request sent successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        db.close()


# ── ADMIN: GET PENDING REQUESTS ────────────────────────────────────────────────

@app.get("/api/requests")
def get_requests():
    db = SessionLocal()
    try:
        reqs = db.query(UserRequest).filter(UserRequest.status == "pending").all()
        return [
            {
                "id":         r.request_id,
                "name":       r.name       or "",
                "image":      image_to_data_uri(r.image_path),
                "created_at": r.created_at or "",
            }
            for r in reqs
        ]
    finally:
        db.close()


# ── ADMIN: APPROVE REQUEST ─────────────────────────────────────────────────────

@app.post("/api/approve/{request_id}")
def approve_request(request_id: int):
    db = SessionLocal()
    try:
        req = db.query(UserRequest).filter(UserRequest.request_id == request_id).first()
        if not req:
            raise HTTPException(404, "Request not found")

        image_path = req.image_path
        req_name   = req.name.strip() if req.name else ""

        if not image_path or not os.path.exists(image_path):
            raise HTTPException(400, f"Image file missing: {image_path}")

        try:
            img  = face_recognition.load_image_file(image_path)
            encs = face_recognition.face_encodings(img)
        except Exception as e:
            raise HTTPException(400, f"Could not read face image: {e}")

        if not encs:
            raise HTTPException(400, f"No face detected for: {req_name}")

        req.status = "approved"
        db.commit()

    finally:
        db.close()

    unique_id = f"UID_{int(time.time())}"
    row_id    = insert_authorized_person(
        name       = req_name,
        unique_id  = unique_id,
        image_path = image_path,
        added_by   = "request",
        date_added = str(datetime.now()),
    )

    known_encodings.append(encs[0])
    known_names.append(req_name)
    known_ids.append(row_id)
    print(f"[approve] '{req_name}' added to memory (id={row_id}). Total: {len(known_encodings)}")

    return {"message": "Approved", "person_id": row_id, "name": req_name}


# ── ADMIN: REJECT REQUEST ──────────────────────────────────────────────────────

@app.post("/api/reject/{request_id}")
def reject_request(request_id: int):
    db = SessionLocal()
    try:
        req = db.query(UserRequest).filter(UserRequest.request_id == request_id).first()
        if not req:
            raise HTTPException(404, "Not found")
        req.status = "rejected"
        db.commit()
    finally:
        db.close()
    return {"message": "Rejected"}


# ── LIVE FEED: RECOGNIZE FACE ──────────────────────────────────────────────────

@app.post("/recognize")
def recognize_face(frame: Frame):
    global intruder_captured, last_intrusion_time

    try:
        img_bytes = base64.b64decode(frame.image.split(",")[1])
    except Exception:
        return {"faces": []}

    np_arr = np.frombuffer(img_bytes, np.uint8)
    img    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return {"faces": []}

    rgb            = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb)
    face_encs      = face_recognition.face_encodings(rgb, face_locations)

    faces_response = []
    intruder_found = False

    for (top, right, bottom, left), enc in zip(face_locations, face_encs):
        name   = "UNAUTHORIZED"
        status = "UNAUTHORIZED"

        if known_encodings:
            matches    = face_recognition.compare_faces(known_encodings, enc, tolerance=0.5)
            face_dists = face_recognition.face_distance(known_encodings, enc)

            if True in matches:
                best_idx = int(np.argmin(face_dists))
                if matches[best_idx]:
                    name   = known_names[best_idx]
                    status = "AUTHORIZED"
                    log_scan(float(1 - face_dists[best_idx]), 1, "AUTHORIZED")

        if status == "UNAUTHORIZED":
            intruder_found = True

        faces_response.append({
            "name":   name,
            "status": status,
            "box":    {"top": top, "right": right, "bottom": bottom, "left": left},
        })

    now = time.time()

    if intruder_found:
        if not intruder_captured and (now - last_intrusion_time) > INTRUSION_COOLDOWN:
            path = save_intruder_snapshot(img)
            send_email_alert(path)          # → always goes to ALERT_RECIPIENT
            log_scan(0.85, 0, "INTRUSION")
            intruder_captured   = True
            last_intrusion_time = now
            print(f"[intrusion] Alert sent to {ALERT_RECIPIENT}. Next in {INTRUSION_COOLDOWN}s.")
    else:
        if intruder_captured and (now - last_intrusion_time) > INTRUSION_RESET_DELAY:
            intruder_captured = False
            print("[intrusion] Flag reset — no intruder detected.")

    return {"faces": faces_response}


# ── GET INTRUDER LOGS ──────────────────────────────────────────────────────────

@app.get("/api/intruders")
def get_intruders():
    files = sorted(os.listdir(INTRUDER_DIR), reverse=True)
    data  = []
    for file in files:
        if not file.endswith(".jpg"):
            continue
        time_part = file.replace("intruder_", "").replace(".jpg", "")
        try:
            ts = datetime.strptime(time_part, "%Y%m%d_%H%M%S").strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            ts = "Unknown"
        data.append({
            "image":     f"http://localhost:8000/intruders/{file}",
            "timestamp": ts,
            "type":      "UNAUTHORIZED",
        })
    return {"logs": data}