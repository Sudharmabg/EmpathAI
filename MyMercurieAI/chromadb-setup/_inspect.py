import sqlite3, os
path = os.path.abspath('../chroma_store/chroma.sqlite3')
conn = sqlite3.connect(path)
cur = conn.cursor()
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print('TABLES:', [t[0] for t in tables])
for (t,) in tables:
    count = cur.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
    cols = [c[1] for c in cur.execute(f'PRAGMA table_info({t})').fetchall()]
    print(f'{t} ({count} rows): {cols}')
conn.close()
