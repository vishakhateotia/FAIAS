from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

# ======================
# CONFIG
# ======================

DB_PATH = "/Users/vindhayteotia/Downloads/aura-secure-dashboard/faias.db"

# ======================
# CREATE APP
# ======================

app = Flask(__name__)
CORS(app)

# ======================
# DB HELPER
# ======================

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ======================
# TEST ROUTE
# ======================

@app.route("/")
def home():
    return "FAIAS Backend is Running on port 5001!"

# ======================
# GET ALERTS
# ======================

@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT alert_id, detected_at, confidence, notified, type
        FROM alerts
        WHERE detected_at >= datetime('now', '-30 seconds')
        ORDER BY detected_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# ======================
# CREATE ALERT  (called by main.py log_scan)
# ======================

@app.route("/api/alert", methods=["POST"])
def create_alert():
    data       = request.get_json()
    confidence = data.get("confidence")
    notified   = data.get("notified")
    alert_type = data.get("type")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO alerts (confidence, notified, type)
        VALUES (?, ?, ?)
    """, (confidence, notified, alert_type))
    conn.commit()
    conn.close()

    return jsonify({"status": "alert logged"})

# ======================
# ANALYTICS
# ======================

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM alerts")
    total_alerts = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM authorized_persons")
    total_authorized = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM alerts WHERE confidence < 0.5")
    false_positives = cursor.fetchone()["total"]

    cursor.execute("SELECT type, COUNT(*) as count FROM alerts GROUP BY type")
    rows = cursor.fetchall()
    detection_ratio = {"intrusions": 0, "authorized": 0, "denied": 0}
    for row in rows:
        t = row["type"].lower()
        if t == "intrusion":
            detection_ratio["intrusions"] = row["count"]
        elif t == "authorized":
            detection_ratio["authorized"] = row["count"]
        elif t == "denied":
            detection_ratio["denied"] = row["count"]

    cursor.execute("""
        SELECT strftime('%w', detected_at) as day, type, COUNT(*) as count
        FROM alerts
        WHERE detected_at >= datetime('now', '-7 days')
        GROUP BY day, type
    """)
    weekly_rows = cursor.fetchall()
    weekly_data = {}
    for row in weekly_rows:
        day   = row["day"]
        t     = row["type"].lower()
        count = row["count"]
        if day not in weekly_data:
            weekly_data[day] = {"day": day, "intrusions": 0, "authorized": 0, "denied": 0}
        if t == "intrusion":
            weekly_data[day]["intrusions"] = count
        elif t == "authorized":
            weekly_data[day]["authorized"] = count
        elif t == "denied":
            weekly_data[day]["denied"] = count

    conn.close()
    return jsonify({
        "total_alerts":     total_alerts,
        "total_authorized": total_authorized,
        "false_positives":  false_positives,
        "detection_ratio":  detection_ratio,
        "weekly_data":      list(weekly_data.values())
    })

# ======================
# FEEDBACK — POST (submit) + GET (admin view)
# ======================

@app.route("/api/feedback", methods=["POST"])
def insert_feedback():
    data    = request.json
    user_id = data.get("user_id")
    message = data.get("message")
    # ✅ FIX: read the actual logged-in user's email and name sent from frontend
    email   = data.get("email", "")
    name    = data.get("name",  "")

    conn   = get_db_connection()
    cursor = conn.cursor()

    # Try inserting with email + name columns (requires migration below)
    try:
        cursor.execute("""
            INSERT INTO feedback (user_id, message, email, name)
            VALUES (?, ?, ?, ?)
        """, (user_id, message, email, name))
    except Exception:
        # Fallback if email/name columns don't exist yet in feedback table
        cursor.execute("""
            INSERT INTO feedback (user_id, message)
            VALUES (?, ?)
        """, (user_id, message))
        # Update the users row so the JOIN in GET returns the correct email
        if email:
            try:
                cursor.execute("""
                    UPDATE users SET email = ?, name = ?
                    WHERE user_id = ?
                """, (email, name, user_id))
            except Exception:
                pass

    conn.commit()
    conn.close()
    return jsonify({"status": "success"})


@app.route("/api/feedback", methods=["GET"])
def get_feedback():
    conn   = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT f.feedback_id, f.user_id, f.message, f.submitted_at,
               COALESCE(f.name,  u.name)  as name,
               COALESCE(f.email, u.email) as email
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.user_id
        ORDER BY f.submitted_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# ======================
# GET USERS (login table)
# ======================

@app.route("/api/users", methods=["GET"])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, name, email, role, created_at FROM users")
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# ======================
# LOGIN
# ======================

@app.route("/api/login", methods=["POST"])
def login():
    data  = request.json
    email = data.get("email")

    conn   = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, name, role FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "User not found"}), 401

    return jsonify({
        "status":  "login success",
        "role":    user["role"],
        "user_id": user["user_id"],
        "name":    user["name"],
    })

# ======================
# FACE AUTH (placeholder)
# ======================

@app.route("/api/face-auth", methods=["POST"])
def face_auth():
    return jsonify({"status": "success", "message": "Face authentication complete"})

# ======================
# RUN SERVER  — port 5001
# ======================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)