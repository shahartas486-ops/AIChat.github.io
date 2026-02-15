import sqlite3
from datetime import datetime

class Database:
    def __init__(self, db_path):
        self.db_path = db_path
        self.init_db()
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Users table with unique session ID and IP
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                username TEXT DEFAULT 'کاربر',
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                sender TEXT,
                message_type TEXT,
                content TEXT,
                file_path TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Check if ip_address column exists, if not add it
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'ip_address' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN ip_address TEXT")
        
        conn.commit()
        conn.close()
    
    # ✅ این تابع باید دقیقاً این شکلی باشه
    def get_or_create_user(self, session_id, client_ip=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, ip_address FROM users WHERE session_id = ?', (session_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.execute(
                '''INSERT INTO users (session_id, username, ip_address) 
                   VALUES (?, ?, ?)''',
                (session_id, f'کاربر-{session_id[:8]}', client_ip)
            )
            user_id = cursor.lastrowid
        else:
            user_id = user[0]
            if client_ip and (len(user) < 2 or user[1] != client_ip):
                cursor.execute(
                    '''UPDATE users SET last_active = ?, ip_address = ? 
                       WHERE id = ?''',
                    (datetime.now().isoformat(), client_ip, user_id)
                )
            else:
                cursor.execute(
                    'UPDATE users SET last_active = ? WHERE id = ?',
                    (datetime.now().isoformat(), user_id)
                )
        
        conn.commit()
        conn.close()
        return user_id
    
    def save_message(self, user_id, sender, message_type, content, file_path=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO messages (user_id, sender, message_type, content, file_path)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, sender, message_type, content, file_path))
        
        conn.commit()
        conn.close()
        return cursor.lastrowid
    
    def get_messages(self, user_id=None, limit=50):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute('''
                SELECT m.*, u.username, u.ip_address 
                FROM messages m 
                JOIN users u ON m.user_id = u.id 
                WHERE m.user_id = ? 
                ORDER BY m.timestamp ASC 
                LIMIT ?
            ''', (user_id, limit))
        else:
            cursor.execute('''
                SELECT m.*, u.username, u.ip_address 
                FROM messages m 
                JOIN users u ON m.user_id = u.id 
                ORDER BY m.timestamp DESC 
                LIMIT ?
            ''', (limit,))
        
        messages = cursor.fetchall()
        conn.close()
        
        result = []
        for msg in messages:
            result.append({
                'id': msg[0],
                'user_id': msg[1],
                'sender': msg[2],
                'message_type': msg[3],
                'content': msg[4],
                'file_path': msg[5],
                'timestamp': msg[6],
                'username': msg[7],
                'ip_address': msg[8] if len(msg) > 8 else None
            })
        
        return result
    
    def get_user_messages(self, user_id, limit=50):
        return self.get_messages(user_id=user_id, limit=limit)
    
    def get_all_users(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.id, u.session_id, u.username, u.ip_address,
                   MAX(m.timestamp) as last_activity,
                   COUNT(m.id) as message_count
            FROM users u
            LEFT JOIN messages m ON u.id = m.user_id
            GROUP BY u.id, u.session_id, u.username, u.ip_address
            ORDER BY last_activity DESC
        ''')
        
        users = cursor.fetchall()
        conn.close()
        
        result = []
        for user in users:
            result.append({
                'id': user[0],
                'session_id': user[1],
                'username': user[2] or 'کاربر',
                'ip_address': user[3],
                'last_activity': user[4] or 'بدون فعالیت',
                'message_count': user[5] or 0
            })
        
        return result
    
    def get_user_by_ip(self, ip_address):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, session_id, username FROM users WHERE ip_address = ?', (ip_address,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user[0],
                'session_id': user[1],
                'username': user[2]
            }
        return None
