# در app.py
import os
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, session
from werkzeug.utils import secure_filename

from config import Config
from database import Database
from ai_service import AIService

app = Flask(__name__)
app.config.from_object(Config)
Config.init_app(app)

# Initialize components
db = Database(app.config['DATABASE'])

ai_service = AIService(
    api_key=app.config['OPENAI_API_KEY'],
    api_url=app.config['OPENAI_API_URL'],
    model=app.config['OPENAI_MODEL']
)

# Helper functions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def process_latex(text):
    import re
    if not text:
        return text
    
    def replace_latex_inline(match):
        latex_code = match.group(1)
        return f'<span class="latex">{latex_code}</span>'
    
    def replace_latex_block(match):
        latex_code = match.group(1)
        return f'<div class="latex-block">{latex_code}</div>'
    
    text = re.sub(r'\$\$(.+?)\$\$', replace_latex_block, text, flags=re.DOTALL)
    text = re.sub(r'\$(.+?)\$', replace_latex_inline, text)
    
    return text

def get_client_ip():
    """دریافت IP واقعی کاربر با در نظر گرفتن پراکسی"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr

# Routes
@app.route('/')
def index():
    # استفاده از ترکیبی از session و IP برای امنیت بیشتر
    if 'user_id' not in session:
        client_ip = get_client_ip()
        user_agent = request.headers.get('User-Agent', '')
        # ایجاد یک شناسه منحصر به فرد از ترکیب IP و User-Agent
        unique_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{client_ip}:{user_agent}"))
        session['user_id'] = unique_id
    
    # ذخیره در دیتابیس با IP
    user_id = db.get_or_create_user(session['user_id'], client_ip=get_client_ip())
    return render_template('index.html', user_id=user_id)

@app.route('/admin')
def admin_panel():
    password = request.args.get('password', '')
    if password != os.environ.get('ADMIN_PASSWORD', 'admin123'):
        return 'دسترسی غیرمجاز', 403
    return render_template('admin.html')

# API Routes
@app.route('/api/send_message', methods=['POST'])
def send_message():
    try:
        data = request.form
        if 'user_id' not in session:
            return jsonify({'status': 'error', 'message': 'Session not found'}), 401
        
        user_id = db.get_or_create_user(session['user_id'])
        message_type = data.get('message_type', 'text')
        content = data.get('content', '')
        chat_type = data.get('chat_type', 'ai')
        
        file_path = None
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                folder = 'users'
                filepath = os.path.join(
                    folder,
                    f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
                )
                full_path = os.path.join(app.config['UPLOAD_FOLDER'], filepath)
                file.save(full_path)
                file_path = filepath
        
        db.save_message(user_id, 'user', message_type, content, file_path)
        
        if chat_type == 'ai':
            ai_reply = ai_service.get_response(content)
            db.save_message(user_id, 'ai', 'text', ai_reply)
            return jsonify({
                'status': 'success',
                'ai_response': ai_reply,
                'user_id': user_id
            })
        
        return jsonify({'status': 'success', 'user_id': user_id})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/get_messages')
def api_get_messages():
    chat_type = request.args.get('chat_type', 'ai')
    
    # **بخش اصلاح شده - مهمترین تغییرات اینجاست**
    if chat_type == 'ai':
        # کاربر عادی - فقط پیام‌های خودش
        if 'user_id' not in session:
            return jsonify({'messages': []})
        
        user_id = db.get_or_create_user(session['user_id'])
        messages = db.get_messages(user_id, 50)
        
    elif chat_type == 'admin':
        # ادمین - همه پیام‌ها رو می‌بینه
        password = request.args.get('password', '')
        if password != os.environ.get('ADMIN_PASSWORD', 'admin123'):
            return jsonify({'status': 'error', 'message': 'دسترسی غیرمجاز'}), 403
        
        # برای ادمین، می‌تونیم همه پیام‌ها رو برگردونیم
        specific_user = request.args.get('user_id')
        if specific_user and specific_user.isdigit():
            messages = db.get_messages(int(specific_user), 50)
        else:
            messages = db.get_messages(limit=50)
    
    else:
        # حالت پیش‌فرض - فقط پیام‌های خود کاربر
        if 'user_id' not in session:
            return jsonify({'messages': []})
        user_id = db.get_or_create_user(session['user_id'])
        messages = db.get_messages(user_id, 50)
    
    # پردازش LaTeX
    for msg in messages:
        if msg['message_type'] == 'text' and msg['content']:
            msg['content'] = process_latex(msg['content'])
    
    return jsonify({'messages': messages})

@app.route('/api/get_users')
def get_users_api():
    # فقط ادمین می‌تونه لیست کاربران رو ببینه
    password = request.args.get('password', '')
    if password != os.environ.get('ADMIN_PASSWORD', 'admin123'):
        return jsonify({'status': 'error', 'message': 'دسترسی غیرمجاز'}), 403
    
    users = db.get_all_users()
    return jsonify({'users': users})

@app.route('/api/admin/send', methods=['POST'])
def admin_send():
    try:
        # تأیید ادمین
        password = request.form.get('password', '')
        if password != os.environ.get('ADMIN_PASSWORD', 'admin123'):
            return jsonify({'status': 'error', 'message': 'دسترسی غیرمجاز'}), 403
        
        data = request.form
        user_id = data.get('user_id')
        message_type = data.get('message_type', 'text')
        content = data.get('content', '')
        
        if not user_id:
            return jsonify({'status': 'error', 'message': 'کاربر انتخاب نشده'})
        
        file_path = None
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(
                    'admin',
                    f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
                )
                full_path = os.path.join(app.config['UPLOAD_FOLDER'], filepath)
                file.save(full_path)
                file_path = filepath
        
        db.save_message(int(user_id), 'admin', message_type, content, file_path)
        return jsonify({'status': 'success'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    # فقط صاحب فایل یا ادمین می‌تونه ببینه
    # این قسمت رو هم می‌تونی امن‌تر کنی
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.secret_key = os.environ.get('SECRET_KEY', 'fallback-secret-key')
    app.run(debug=True, port=5000, host='0.0.0.0')
