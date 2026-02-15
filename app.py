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

# **این بخش رو اصلاح کن:**
ai_service = AIService(
    api_key=app.config['OPENAI_API_KEY'],  # این رو تغییر دادم
    api_url=app.config['OPENAI_API_URL'],  # این رو تغییر دادم
    model=app.config['OPENAI_MODEL']       # این رو تغییر دادم
)

# Helper functions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

# ... بقیه کدها بدون تغییر
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

# Routes
@app.route('/')
def index():
    session_id = session.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        session['session_id'] = session_id
    
    user_id = db.get_or_create_user(session_id)
    return render_template('index.html', session_id=session_id)

@app.route('/admin')
def admin_panel():
    password = request.args.get('password', '')
    if password != 'password_admin':
        return 'دسترسی غیرمجاز', 403
    return render_template('admin.html')

# API Routes
@app.route('/api/send_message', methods=['POST'])
def send_message():
    try:
        data = request.form
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({'status': 'error', 'message': 'Session not found'})
        
        user_id = db.get_or_create_user(session_id)
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
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/get_messages')
def api_get_messages():
    chat_type = request.args.get('chat_type', 'ai')
    session_id = session.get('session_id')
    
    if chat_type == 'ai' and session_id:
        user_id = db.get_or_create_user(session_id)
        messages = db.get_messages(user_id, 50)
    else:
        user_id = request.args.get('user_id')
        if user_id and user_id.isdigit():
            messages = db.get_messages(int(user_id), 50)
        else:
            messages = db.get_messages(limit=50)
    
    for msg in messages:
        if msg['message_type'] == 'text' and msg['content']:
            msg['content'] = process_latex(msg['content'])
    
    return jsonify({'messages': messages})

@app.route('/api/get_users')
def get_users_api():
    users = db.get_all_users()
    return jsonify({'users': users})

@app.route('/api/admin/send', methods=['POST'])
def admin_send():
    try:
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
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.secret_key = 'super-secret-key-change-in-production'
    app.run(debug=True, port=5000, host='0.0.0.0')
