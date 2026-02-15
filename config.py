# در config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-123-change-in-production'
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    DATABASE = 'data/chat_data.db'
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {
        'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif',
        'mp3', 'wav', 'mp4', 'avi', 'mov', 'webp'
    }
    
    # **تنظیمات ChatGPT API - از محیط می‌گیره**
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')  # ✅ این از Render/Secrets میاد
    OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
    OPENAI_MODEL = 'gpt-3.5-turbo'
    
    AI_API_KEY = OPENAI_API_KEY
    AI_ENDPOINT = OPENAI_API_URL
    
    @staticmethod
    def init_app(app):
        # Create necessary directories
        os.makedirs('uploads/users', exist_ok=True)
        os.makedirs('uploads/admin', exist_ok=True)
        os.makedirs('data', exist_ok=True)