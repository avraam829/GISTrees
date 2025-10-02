#!/usr/bin/env python3
import os
import io
import json
import hashlib
import datetime as dt
from flask import Flask, request, jsonify, send_file, abort
from flask_cors import CORS

from psycopg2.extras import Json  # безопасная передача JSON/строк в exif_user_comment
from db import db_cursor           # единая точка подключения к БД

# Где храним фото (шардинг по sha)
UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", "/var/lib/gistrees/uploads")

# ------------- FS helpers -------------
def shard_dirs_for_sha(sha: str) -> str:
    return os.path.join(UPLOAD_ROOT, sha[:2], sha[2:4])

def path_for_sha(sha: str) -> str:
    return os.path.join(shard_dirs_for_sha(sha), f"{sha}.jpg")

def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)

def is_valid_sha(sha: str) -> bool:
    return len(sha) == 64 and all(c in "0123456789abcdef" for c in sha)

# ------------- EXIF (минимум для GPS) -------------
try:
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS
except Exception:
    Image = None

def _get_exif_dict(pil_img):
    exif = pil_img.getexif()
    if not exif:
        return {}
    out = {}
    for tag_id, val in exif.items():
        tag = TAGS.get(tag_id, tag_id)
        out[tag] = val
    return out

def _parse_gps(exif):
    gps_info = exif.get('GPSInfo')
    if not gps_info:
        return None, None
    gps = {}
    for key in gps_info.keys():
        name = GPSTAGS.get(key, key)
        gps[name] = gps_info[key]

    def conv_to_deg(val):
        # val: ((num,den), (num,den), (num,den))
        d = val[0][0] / val[0][1]
        m = val[1][0] / val[1][1]
        s = val[2][0] / val[2][1]
        return d + (m / 60.0) + (s / 3600.0)

    lat = lon = None
    if 'GPSLatitude' in gps and 'GPSLatitudeRef' in gps:
        lat = conv_to_deg(gps['GPSLatitude'])
        if gps['GPSLatitudeRef'] in ['S', b'S']:
            lat = -lat
    if 'GPSLongitude' in gps and 'GPSLongitudeRef' in gps:
        lon = conv_to_deg(gps['GPSLongitude'])
        if gps['GPSLongitudeRef'] in ['W', b'W']:
            lon = -lon
    return lat, lon

# ------------- Flask -------------
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.get("/api/v1/health")
def health():
    return {"ok": True, "time": dt.datetime.utcnow().isoformat() + "Z"}

# ------------- Upload -------------
@app.post("/api/v1/photos")
def upload_photo():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file"}), 400

    content_sha = request.form.get("content_sha256") or ""
    device_id   = request.form.get("device_id") or None
    exif_user_comment = request.form.get("exif_user_comment") or None
    shot_time_str     = request.form.get("shot_time") or None

    # 1) буфер + sha256
    h = hashlib.sha256()
    buf = io.BytesIO()
    chunk = f.stream.read(1024 * 1024)
    while chunk:
        buf.write(chunk)
        h.update(chunk)
        chunk = f.stream.read(1024 * 1024)
    file_sha = h.hexdigest()
    buf.seek(0)

    if content_sha and content_sha != file_sha:
        app.logger.warning("content_sha mismatch: client=%s server=%s", content_sha, file_sha)

    # 2) EXIF → GPS (если Pillow доступен)
    lat = lon = None
    if Image is not None:
        try:
            img = Image.open(buf)
            exif = _get_exif_dict(img)
            lat, lon = _parse_gps(exif)
            buf.seek(0)
        except Exception:
            buf.seek(0)

    # 2a) Приоритет координат из формы, если присланы
    lat_form = request.form.get("lat")
    lon_form = request.form.get("lon")
    try:
        if lat_form and lon_form:
            lat = float(lat_form)
            lon = float(lon_form)
    except Exception:
        pass

    # 3) shot_time: поддержим ISO и EXIF-формат "YYYY:MM:DD HH:MM:SS"
    shot_time = None
    if shot_time_str:
        try:
            shot_time = dt.datetime.fromisoformat(shot_time_str.replace("Z", "+00:00"))
        except Exception:
            try:
                shot_time = dt.datetime.strptime(shot_time_str, "%Y:%m:%d %H:%M:%S")
            except Exception:
                shot_time = None

    # 4) Файл на диск (шардинг по sha)
    final_dir = shard_dirs_for_sha(file_sha)
    ensure_dir(final_dir)
    final_path = path_for_sha(file_sha)
    new_file = False
    if not os.path.exists(final_path):
        with open(final_path, "wb") as out:
            out.write(buf.getbuffer())
        os.chmod(final_path, 0o640)
        new_file = True

    # 5) exif_user_comment как JSON, если это JSON; иначе как строка
    exif_payload = None
    if exif_user_comment:
        try:
            exif_payload = json.loads(exif_user_comment)
        except Exception:
            exif_payload = exif_user_comment  # сохраним строкой

    # 6) Запись в БД (upsert по sha256), безопасно строим геометрию
    with db_cursor() as cur:
        cur.execute("""
            INSERT INTO photos (sha256, device_id, shot_time, lat, lon, geom, exif_user_comment)
            VALUES (
                %s, %s, %s, %s, %s,
                CASE WHEN %s IS NOT NULL AND %s IS NOT NULL
                     THEN ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
                     ELSE NULL END,
                %s
            )
            ON CONFLICT (sha256) DO UPDATE
            SET device_id = COALESCE(EXCLUDED.device_id, photos.device_id),
                shot_time = COALESCE(EXCLUDED.shot_time, photos.shot_time),
                lat = COALESCE(EXCLUDED.lat, photos.lat),
                lon = COALESCE(EXCLUDED.lon, photos.lon),
                geom = COALESCE(EXCLUDED.geom, photos.geom),
                exif_user_comment = COALESCE(EXCLUDED.exif_user_comment, photos.exif_user_comment),
                updated_at = now()
            RETURNING id, lat, lon;
        """, (
            file_sha, device_id, shot_time, lat, lon,
            lon, lat,  # проверка NOT NULL
            lon, lat,  # ST_MakePoint(lon, lat)
            Json(exif_payload)
        ))
        row = cur.fetchone()

    return jsonify({
        "id": row["id"],
        "sha256": file_sha,
        "existed": (not new_file),
        "lat": float(row["lat"]) if row["lat"] is not None else None,
        "lon": float(row["lon"]) if row["lon"] is not None else None,
        "has_geom": (row["lat"] is not None and row["lon"] is not None),
    })

# ------------- List -------------
@app.get("/api/v1/photos")
def list_photos():
    """
    Параметры:
      - limit: int = 1000 (макс 5000)
      - bbox:  minLon,minLat,maxLon,maxLat  (WGS84)
    Возвращает: [{id, sha256, lat, lon, device_id, shot_time, created_at, image_url}]
    """
    try:
        limit = min(int(request.args.get("limit", 1000)), 5000)
    except Exception:
        limit = 1000

    bbox = request.args.get("bbox")

    if bbox:
        try:
            minLon, minLat, maxLon, maxLat = map(float, bbox.split(","))
        except Exception:
            return jsonify({"error": "bad bbox"}), 400

        sql = """
          SELECT id, sha256, device_id, shot_time, lat, lon, created_at
          FROM photos
          WHERE geom IS NOT NULL
            AND ST_Intersects(
                geom,
                ST_MakeEnvelope(%s,%s,%s,%s,4326)::geography
            )
          ORDER BY created_at DESC
          LIMIT %s;
        """
        params = (minLon, minLat, maxLon, maxLat, limit)
    else:
        sql = """
          SELECT id, sha256, device_id, shot_time, lat, lon, created_at
          FROM photos
          WHERE geom IS NOT NULL
          ORDER BY created_at DESC
          LIMIT %s;
        """
        params = (limit,)

    with db_cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    for r in rows:
        r["image_url"] = f"/api/v1/photos/{r['sha256']}.jpg"
    return jsonify(rows)

# ------------- File serve -------------
@app.get("/api/v1/photos/<sha>.jpg")
def get_photo(sha: str):
    sha = sha.lower()
    if not is_valid_sha(sha):
        return abort(404)
    p = path_for_sha(sha)
    if not os.path.exists(p):
        return abort(404)
    return send_file(p, mimetype="image/jpeg", as_attachment=False)

# ------------- Delete (БД + файл) -------------
@app.delete("/api/v1/photos/<sha>")
def delete_photo(sha: str):
    sha = sha.lower()
    if not is_valid_sha(sha):
        return jsonify({"error": "bad sha"}), 400

    # 1) удаляем запись из БД
    with db_cursor() as cur:
        cur.execute("DELETE FROM photos WHERE sha256 = %s RETURNING id;", (sha,))
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404

    # 2) удаляем файл с диска (best-effort)
    p = path_for_sha(sha)
    try:
        if os.path.exists(p):
            os.remove(p)
    except Exception:
        pass

    return jsonify({"ok": True, "deleted_id": row["id"], "sha256": sha})

if __name__ == "__main__":
    # dev
    app.run("127.0.0.1", 8000, debug=True)
