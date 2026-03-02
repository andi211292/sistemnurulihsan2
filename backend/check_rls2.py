import os
from dotenv import load_dotenv
import psycopg2
load_dotenv()
conn = psycopg2.connect(os.environ.get('CLOUD_DATABASE_URL'))
cur = conn.cursor()
cur.execute("SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'students';")
print('Policies for students table:')
for row in cur.fetchall():
    print(row)
