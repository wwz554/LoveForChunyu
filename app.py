from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import date, datetime
from pathlib import Path
import sqlite3, re

BASE = Path(__file__).resolve().parent
DATA = BASE / 'data'
UPLOADS = DATA / 'uploads'
DB = DATA / 'repair_records.db'
UPLOADS.mkdir(parents=True, exist_ok=True)

app = FastAPI(title='模块返修管理系统', version='1.0.0')
FIELDS = ['spec_model','device_sn','device_code','workshop_site','return_date','ship_date','ship_from','recipient','sender','notes']


def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with conn() as db:
        db.execute('''CREATE TABLE IF NOT EXISTS records(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          spec_model TEXT DEFAULT '', device_sn TEXT DEFAULT '', device_code TEXT DEFAULT '',
          workshop_site TEXT DEFAULT '', return_date TEXT DEFAULT '', ship_date TEXT DEFAULT '',
          ship_from TEXT DEFAULT '', recipient TEXT DEFAULT '', sender TEXT DEFAULT '', notes TEXT DEFAULT '',
          source TEXT DEFAULT 'manual', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )''')
        db.commit()

init_db()

class RecordIn(BaseModel):
    spec_model: str = ''
    device_sn: str = ''
    device_code: str = ''
    workshop_site: str = ''
    return_date: str = ''
    ship_date: str = ''
    ship_from: str = ''
    recipient: str = ''
    sender: str = ''
    notes: str = ''
    source: str = 'manual'


def normalize_date(s: str) -> str:
    if not s: return ''
    m = re.search(r'(20\d{2})[\-/年](\d{1,2})[\-/月](\d{1,2})', s.strip())
    if m: return f'{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'
    m = re.search(r'(20\d{2})(\d{2})(\d{2})', s.strip())
    return f'{m.group(1)}-{m.group(2)}-{m.group(3)}' if m else s.strip()


def extract_date(text: str) -> str:
    m = re.search(r'(20\d{2}[\-/年]\d{1,2}[\-/月]\d{1,2})', text)
    return normalize_date(m.group(1)) if m else ''


def parse_text(text: str) -> Dict[str, str]:
    t = text.replace('\r', '\n')
    out = {k: '' for k in FIELDS}
    def grab(patterns):
        for p in patterns:
            m = re.search(p, t, re.I)
            if m: return m.group(1).strip()
        return ''
    out['spec_model'] = grab([r'(?:规格|型号|设备型号|module model)\s*[:：=]?\s*([^\n,，;；]+)'])
    out['device_sn'] = grab([r'(?:SN|S/N|序列号|设备SN)\s*[:：=#\s-]*([A-Z0-9][A-Z0-9\-_./]{4,})'])
    out['device_code'] = grab([r'(?:设备识别码|识别码|设备编码|asset\s*(?:id|code))\s*[:：=]?\s*([^\n,，;；]+)'])
    out['workshop_site'] = grab([r'(?:车间|站点|地点|site|workshop)\s*[:：=]?\s*([^\n,，;；]+)'])
    out['return_date'] = grab([r'(?:返回时间|返修时间|返回日期|退回时间)\s*[:：=]?\s*([^\n,，;；]+)']) or extract_date(t)
    out['ship_date'] = grab([r'(?:发出时间|寄出时间|发货时间|寄件日期)\s*[:：=]?\s*([^\n,，;；]+)'])
    out['ship_from'] = grab([r'(?:发出地|寄件地|寄出地|寄件地址)\s*[:：=]?\s*([^\n]+)'])
    out['recipient'] = grab([r'(?:收件人|收货人|收件姓名)\s*[:：=]?\s*([^\n,，;；]+)'])
    out['sender'] = grab([r'(?:寄件人|发件人|寄货人)\s*[:：=]?\s*([^\n,，;；]+)'])
    out['notes'] = grab([r'(?:备注|说明|故障|问题)\s*[:：=]?\s*([^\n]+)'])
    return out


def map_headers(headers: List[Any]):
    aliases = {
      'spec_model':['规格/型号','规格型号','型号','规格','设备型号','model','spec'],
      'device_sn':['设备sn','sn','s/n','序列号','设备序列号'],
      'device_code':['设备识别码','识别码','设备编码','设备id','asset id','asset code'],
      'workshop_site':['车间/站点','车间','站点','地点','site','workshop'],
      'return_date':['返回时间','返修时间','返回日期','退回时间','return date'],
      'ship_date':['发出时间','寄出时间','发货时间','寄件日期','ship date'],
      'ship_from':['发出地','寄件地','寄出地','寄件地址','ship from'],
      'recipient':['收件人','收货人','收件姓名','recipient'],
      'sender':['寄件人','发件人','寄货人','sender'],
      'notes':['备注','说明','故障','问题','notes']
    }
    result = {}
    for i, h in enumerate(headers):
        key = str(h).strip().lower()
        for field, names in aliases.items():
            if any(n.lower() == key or n.lower() in key for n in names):
                result[i] = field
                break
    return result


def insert_record(rec: Dict[str, str], source='manual'):
    now = datetime.now().isoformat(timespec='seconds')
    values = [rec.get(k, '') or '' for k in FIELDS]
    with conn() as db:
        cur = db.execute('INSERT INTO records (' + ','.join(FIELDS) + ',source,created_at,updated_at) VALUES (' + ','.join('?' for _ in range(len(FIELDS)+3)) + ')', values + [source, now, now])
        db.commit()
        return cur.lastrowid


def row_to_dict(r):
    d = dict(r)
    d.pop('created_at', None); d.pop('updated_at', None)
    return d

@app.get('/')
def home():
    return FileResponse(BASE / 'static/index.html')

@app.get('/api/records')
def list_records():
    with conn() as db:
        rows = db.execute('SELECT * FROM records ORDER BY id DESC').fetchall()
    return [row_to_dict(r) for r in rows]

@app.post('/api/records')
def create_record(rec: RecordIn):
    data = rec.model_dump()
    if not data['return_date']:
        data['return_date'] = date.today().isoformat()
    source = data.pop('source', 'manual')
    rid = insert_record(data, source)
    with conn() as db:
        r = db.execute('SELECT * FROM records WHERE id=?', (rid,)).fetchone()
    return row_to_dict(r)

@app.put('/api/records/{rid}')
def update_record(rid: int, rec: RecordIn):
    with conn() as db:
        if not db.execute('SELECT id FROM records WHERE id=?', (rid,)).fetchone():
            raise HTTPException(404, '记录不存在')
        data = rec.model_dump(); now = datetime.now().isoformat(timespec='seconds')
        db.execute('UPDATE records SET ' + ','.join(f'{k}=?' for k in FIELDS) + ',updated_at=? WHERE id=?', [data.get(k, '') for k in FIELDS] + [now, rid])
        db.commit()
        r = db.execute('SELECT * FROM records WHERE id=?', (rid,)).fetchone()
    return row_to_dict(r)

@app.delete('/api/records/{rid}')
def delete_record(rid: int):
    with conn() as db:
        db.execute('DELETE FROM records WHERE id=?', (rid,)); db.commit()
    return {'ok': True}

@app.post('/api/parse-text')
async def parse_text_endpoint(payload: Dict[str, Any]):
    text = str(payload.get('text', ''))
    return {'record': parse_text(text), 'recognized_text': text}

@app.post('/api/ocr')
async def ocr(files: List[UploadFile] = File(...)):
    try:
        from PIL import Image
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR()
    except Exception as e:
        raise HTTPException(500, f'OCR组件未安装或初始化失败: {e}')
    texts = []
    for f in files:
        raw = await f.read()
        tmp = UPLOADS / f'{datetime.now().timestamp()}_{Path(f.filename or "image.jpg").name}'
        tmp.write_bytes(raw)
        try:
            img = Image.open(tmp).convert('RGB')
            result, _ = engine(img)
            texts.extend([x[1] for x in (result or []) if len(x) >= 2])
        finally:
            try: tmp.unlink()
            except OSError: pass
    joined = '\n'.join(texts)
    return {'recognized_text': joined, 'record': parse_text(joined)}

@app.post('/api/import/excel')
async def import_excel(file: UploadFile = File(...)):
    try:
        import pandas as pd
    except Exception as e:
        raise HTTPException(500, f'缺少 pandas: {e}')
    raw = await file.read()
    path = UPLOADS / f'{datetime.now().timestamp()}_{Path(file.filename or "import.xlsx").name}'
    path.write_bytes(raw)
    created = []
    try:
        sheets = pd.read_excel(path, sheet_name=None)
        for _, df in sheets.items():
            if df.empty: continue
            mapping = map_headers(df.columns.tolist())
            if not mapping:
                mapping = {i: f for i, f in enumerate(FIELDS[:len(df.columns)])}
            for _, row in df.iterrows():
                rec = {k: '' for k in FIELDS}
                for idx, field in mapping.items():
                    if idx < len(row):
                        val = row.iloc[idx]
                        if pd.isna(val): continue
                        rec[field] = str(val).strip()
                if not any(rec.values()): continue
                rec['return_date'] = normalize_date(rec['return_date'])
                rid = insert_record(rec, 'excel')
                rec['id'] = rid; created.append(rec)
    finally:
        try: path.unlink()
        except OSError: pass
    return {'count': len(created), 'records': created}

app.mount('/static', StaticFiles(directory=BASE / 'static'), name='static')
