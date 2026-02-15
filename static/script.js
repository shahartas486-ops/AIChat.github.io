// متغیرهای عمومی
let currentChatType = 'ai';
let currentUserId = null;
let messageInterval = null;
let adminMessageInterval = null;

// تغییر نوع چت
function switchChat(type) {
    currentChatType = type;
    
    // فعال کردن دکمه مربوطه
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (type === 'ai') {
        document.querySelector('.menu-btn:nth-child(1)').classList.add('active');
        document.getElementById('chat-title').textContent = "دستیار هوش مصنوعی";
        document.getElementById('ai-animation').style.display = 'flex';
    } else {
        document.querySelector('.menu-btn:nth-child(2)').classList.add('active');
        document.getElementById('chat-title').textContent = "پشتیبانی";
        document.getElementById('ai-animation').style.display = 'none';
    }
    
    // پاک کردن پیام‌ها
    document.getElementById('messages').innerHTML = '';
    
    // بارگیری پیام‌های جدید
    clearInterval(messageInterval);
    loadMessages();
    
    // تنظیم بازخوانی خودکار
    messageInterval = setInterval(loadMessages, 2000);
}

// ارسال پیام
async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message && !document.getElementById('file-upload').files.length) {
        showNotification('لطفا پیام یا فایل وارد کنید', 'warning');
        return;
    }
    
    // نمایش پیام کاربر
    addMessageToChat('user', message);
    input.value = '';
    
    // نمایش وضعیت در حال ارسال
    showTypingIndicator();
    
    const formData = new FormData();
    formData.append('message_type', 'text');
    formData.append('content', message);
    formData.append('chat_type', currentChatType);
    
    // فایل آپلود شده
    const fileInput = document.getElementById('file-upload');
    if (fileInput.files.length > 0) {
        const fileType = document.getElementById('file-type').value;
        formData.append('message_type', fileType);
        
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('file', fileInput.files[i]);
        }
        
        fileInput.value = '';
        document.getElementById('file-input').style.display = 'none';
    }
    
    try {
        const response = await fetch('/api/send_message', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        // حذف نشانگر تایپ
        removeTypingIndicator();
        
        if (result.status === 'success' && result.ai_response) {
            // نمایش پاسخ هوش مصنوعی
            setTimeout(() => {
                addMessageToChat('ai', result.ai_response);
            }, 800);
        }
        
        // بارگیری مجدد پیام‌ها
        loadMessages();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('خطا در ارسال پیام', 'error');
        removeTypingIndicator();
    }
}

// افزودن پیام به چت
function addMessageToChat(sender, content, filePath = null, timestamp = null) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    let messageContent = '';
    let fileContent = '';
    
    if (filePath) {
        const fileType = filePath.split('.').pop().toLowerCase();
        const fileUrl = `/uploads/${filePath}`;
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) {
            fileContent = `<div class="message-file"><img src="${fileUrl}" class="file-preview" onclick="openFile('${fileUrl}')"></div>`;
        } else if (['mp4', 'avi', 'mov', 'webm'].includes(fileType)) {
            fileContent = `<div class="message-file"><video controls class="file-preview"><source src="${fileUrl}" type="video/mp4"></video></div>`;
        } else if (['mp3', 'wav', 'ogg'].includes(fileType)) {
            fileContent = `<div class="message-file"><audio controls><source src="${fileUrl}"></audio></div>`;
        } else {
            fileContent = `<div class="message-file"><a href="${fileUrl}" download class="file-download"><i class="fas fa-download"></i> دانلود فایل</a></div>`;
        }
    }
    
    if (content) {
        messageContent = `<div class="message-content">${content}</div>`;
    }
    
    const time = timestamp ? new Date(timestamp).toLocaleTimeString('fa-IR') : new Date().toLocaleTimeString('fa-IR');
    
    messageDiv.innerHTML = `
        ${messageContent}
        ${fileContent}
        <div class="message-time">${time}</div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // رندر LaTeX
    if (window.MathJax) {
        MathJax.typesetPromise([messageDiv]);
    }
}

// بارگیری پیام‌ها
async function loadMessages() {
    try {
        const response = await fetch(`/api/get_messages?chat_type=${currentChatType}`);
        const data = await response.json();
        
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        
        data.messages.forEach(msg => {
            addMessageToChat(msg.sender, msg.content, msg.file_path, msg.timestamp);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// مدیریت فایل‌ها
function toggleFileInput() {
    const fileInput = document.getElementById('file-input');
    fileInput.style.display = fileInput.style.display === 'none' ? 'block' : 'none';
}

// باز کردن فایل
function openFile(url) {
    window.open(url, '_blank');
}

// نمایش نشانگر تایپ
function showTypingIndicator() {
    const messagesDiv = document.getElementById('messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="ai-dots">
            <div class="ai-dot"></div>
            <div class="ai-dot"></div>
            <div class="ai-dot"></div>
            <div class="ai-dot"></div>
        </div>
        <span>در حال تایپ...</span>
    `;
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// نمایش نوتیفیکیشن
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// تنظیمات اولیه
document.addEventListener('DOMContentLoaded', function() {
    // تنظیم کاربر با شناسه منحصر به فرد
    if (!localStorage.getItem('userSession')) {
        const sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userSession', sessionId);
        sessionStorage.setItem('sessionId', sessionId);
    }
    
    // مدیریت Enter برای ارسال پیام
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // بارگیری اولیه
    if (document.getElementById('messages')) {
        loadMessages();
        messageInterval = setInterval(loadMessages, 2000);
    }
    
    // نمایش انیمیشن ربات
    createBotAnimation();
});

// ایجاد انیمیشن ربات
function createBotAnimation() {
    const botDiv = document.createElement('div');
    botDiv.className = 'bot-animation';
    botDiv.innerHTML = `
        <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#4361ee" opacity="0.8"/>
            <circle cx="40" cy="40" r="5" fill="white"/>
            <circle cx="60" cy="40" r="5" fill="white"/>
            <path d="M35,65 Q50,75 65,65" stroke="white" stroke-width="3" fill="none"/>
            <path d="M30,20 Q50,10 70,20" stroke="white" stroke-width="2" fill="none"/>
        </svg>
    `;
    document.body.appendChild(botDiv);
}
