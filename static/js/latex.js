/**
 * مدیریت LaTeX در چت
 */

// متغیرهای LaTeX
let latexModalActive = false;
let adminLatexModalActive = false;

/**
 * باز کردن مودال LaTeX برای کاربران عادی
 */
function insertLatex() {
    latexModalActive = true;
    document.getElementById('latex-modal').style.display = 'flex';
    document.getElementById('latex-input').focus();
}

/**
 * درج متن LaTeX در کادر پیام
 */
function insertLatexText() {
    const latexInput = document.getElementById('latex-input');
    const messageInput = document.getElementById('message-input');
    
    if (latexInput.value.trim()) {
        const latexContent = latexInput.value.trim();
        
        // بررسی اینکه آیا فرمول inline است یا block
        let formattedLatex;
        if (latexContent.includes('\\begin{') || latexContent.includes('\\[')) {
            // فرمول بلوکی
            formattedLatex = `$$${latexContent}$$`;
        } else {
            // فرمول inline
            formattedLatex = `$${latexContent}$`;
        }
        
        // درج در کادر پیام
        if (messageInput) {
            messageInput.value += formattedLatex + ' ';
            messageInput.focus();
            
            // رندر سریع برای پیش‌نمایش
            previewLatex(messageInput);
        }
    }
    
    closeLatexModal();
}

/**
 * بستن مودال LaTeX
 */
function closeLatexModal() {
    latexModalActive = false;
    document.getElementById('latex-modal').style.display = 'none';
    document.getElementById('latex-input').value = '';
}

/**
 * باز کردن مودال LaTeX برای ادمین
 */
function insertAdminLatex() {
    adminLatexModalActive = true;
    document.getElementById('admin-latex-modal').style.display = 'flex';
    document.getElementById('admin-latex-input').focus();
}

/**
 * درج متن LaTeX در کادر پیام ادمین
 */
function insertAdminLatexText() {
    const latexInput = document.getElementById('admin-latex-input');
    const messageInput = document.getElementById('admin-message-input');
    
    if (latexInput.value.trim()) {
        const latexContent = latexInput.value.trim();
        
        // بررسی اینکه آیا فرمول inline است یا block
        let formattedLatex;
        if (latexContent.includes('\\begin{') || latexContent.includes('\\[')) {
            // فرمول بلوکی
            formattedLatex = `$$${latexContent}$$`;
        } else {
            // فرمول inline
            formattedLatex = `$${latexContent}$`;
        }
        
        // درج در کادر پیام
        if (messageInput) {
            messageInput.value += formattedLatex + ' ';
            messageInput.focus();
        }
    }
    
    closeAdminLatexModal();
}

/**
 * بستن مودال LaTeX ادمین
 */
function closeAdminLatexModal() {
    adminLatexModalActive = false;
    document.getElementById('admin-latex-modal').style.display = 'none';
    document.getElementById('admin-latex-input').value = '';
}

/**
 * پیش‌نمایش LaTeX در کادر ورودی
 */
function previewLatex(textarea) {
    const previewDiv = document.getElementById('latex-preview');
    if (!previewDiv) {
        const newPreviewDiv = document.createElement('div');
        newPreviewDiv.id = 'latex-preview';
        newPreviewDiv.style.cssText = `
            position: absolute;
            background: rgba(26, 26, 46, 0.95);
            padding: 15px;
            border-radius: 10px;
            border: 2px solid #4361ee;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 1000;
            max-width: 400px;
            display: none;
        `;
        textarea.parentNode.appendChild(newPreviewDiv);
    }
    
    const text = textarea.value;
    const latexMatches = text.match(/\$.*?\$|\$\$.*?\$\$/g);
    
    if (latexMatches && latexMatches.length > 0) {
        const previewDiv = document.getElementById('latex-preview');
        let previewHTML = '<h4>پیش‌نمایش فرمول‌ها:</h4>';
        
        latexMatches.forEach((latex, index) => {
            previewHTML += `<div class="latex-preview-item" style="margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px;">`;
            previewHTML += `<strong>فرمول ${index + 1}:</strong><br>`;
            previewHTML += `<span style="font-family: 'Cambria Math';">${latex}</span>`;
            previewHTML += `</div>`;
        });
        
        previewDiv.innerHTML = previewHTML;
        previewDiv.style.display = 'block';
        
        // موقعیت‌دهی مودال
        const rect = textarea.getBoundingClientRect();
        previewDiv.style.top = (rect.top - previewDiv.offsetHeight - 10) + 'px';
        previewDiv.style.left = rect.left + 'px';
        
        // رندر MathJax
        if (window.MathJax) {
            MathJax.typesetPromise([previewDiv]).catch(err => {
                console.log('MathJax rendering error:', err);
            });
        }
        
        // مخفی کردن پس از چند ثانیه
        setTimeout(() => {
            previewDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * مدیریت رویدادهای کیبورد برای LaTeX
 */
document.addEventListener('keydown', function(e) {
    // بستن مودال با Escape
    if (e.key === 'Escape') {
        if (latexModalActive) {
            closeLatexModal();
        }
        if (adminLatexModalActive) {
            closeAdminLatexModal();
        }
    }
    
    // میانبر برای LaTeX (Ctrl + L)
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        if (document.getElementById('latex-modal')) {
            insertLatex();
        }
    }
});

/**
 * رندر مجدد LaTeX در پیام‌ها
 */
function rerenderLatex() {
    if (window.MathJax) {
        MathJax.typesetPromise().catch(err => {
            console.log('MathJax re-rendering error:', err);
        });
    }
}

/**
 * جستجوی فرمول‌های LaTeX در متن
 */
function findLatexInText(text) {
    const inlinePattern = /\$(.*?)\$/g;
    const blockPattern = /\$\$(.*?)\$\$/gs;
    
    const inlineMatches = [...text.matchAll(inlinePattern)];
    const blockMatches = [...text.matchAll(blockPattern)];
    
    return {
        inline: inlineMatches.map(m => m[1]),
        block: blockMatches.map(m => m[1]),
        all: [...inlineMatches, ...blockMatches]
    };
}

/**
 * تبدیل LaTeX به HTML
 */
function latexToHtml(latex, isBlock = false) {
    const container = document.createElement('div');
    if (isBlock) {
        container.className = 'latex-block';
        container.innerHTML = `\\[${latex}\\]`;
    } else {
        container.className = 'latex';
        container.innerHTML = `\\(${latex}\\)`;
    }
    
    // رندر MathJax
    if (window.MathJax) {
        MathJax.typesetPromise([container]);
    }
    
    return container.outerHTML;
}

/**
 * ایجاد کلیدهای میانبر LaTeX
 */
function createLatexShortcuts() {
    const shortcuts = [
        { symbol: 'α', latex: '\\alpha', desc: 'آلفا' },
        { symbol: 'β', latex: '\\beta', desc: 'بتا' },
        { symbol: 'γ', latex: '\\gamma', desc: 'گاما' },
        { symbol: '∑', latex: '\\sum', desc: 'سیگما' },
        { symbol: '∫', latex: '\\int', desc: 'انتگرال' },
        { symbol: '√', latex: '\\sqrt', desc: 'ریشه' },
        { symbol: '∞', latex: '\\infty', desc: 'بی‌نهایت' },
        { symbol: 'π', latex: '\\pi', desc: 'پی' },
        { symbol: '≠', latex: '\\neq', desc: 'نابرابر' },
        { symbol: '≈', latex: '\\approx', desc: 'تقریباً' }
    ];
    
    return shortcuts;
}

/**
 * نمایش کیبورد LaTeX
 */
function showLatexKeyboard() {
    const modal = document.createElement('div');
    modal.className = 'latex-keyboard-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 2000;
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(5px);
    `;
    
    const shortcuts = createLatexShortcuts();
    let keyboardHTML = `
        <div class="keyboard-content" style="
            background: rgba(26, 26, 46, 0.95);
            padding: 30px;
            border-radius: 20px;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            border: 2px solid #4361ee;
        ">
            <h3 style="color: #4361ee; margin-bottom: 20px; text-align: center;">
                <i class="fas fa-keyboard"></i> کیبورد LaTeX
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
    `;
    
    shortcuts.forEach(shortcut => {
        keyboardHTML += `
            <button class="latex-shortcut-btn" style="
                background: rgba(67, 97, 238, 0.2);
                border: 1px solid #4361ee;
                color: white;
                padding: 15px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            " onclick="insertLatexShortcut('${shortcut.latex}')">
                <span style="font-size: 24px; font-family: 'Cambria Math';">${shortcut.symbol}</span>
                <span style="font-size: 12px;">${shortcut.desc}</span>
                <code style="font-size: 10px; background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 3px;">${shortcut.latex}</code>
            </button>
        `;
    });
    
    keyboardHTML += `
            </div>
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="closeLatexKeyboard()" style="
                    background: #f72585;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 16px;
                ">
                    بستن
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = keyboardHTML;
    document.body.appendChild(modal);
    
    // بستن با کلیک خارج
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeLatexKeyboard();
        }
    });
}

/**
 * درج میانبر LaTeX
 */
function insertLatexShortcut(latex) {
    const messageInput = document.getElementById('message-input') || 
                        document.getElementById('admin-message-input');
    
    if (messageInput) {
        messageInput.value += latex + ' ';
        messageInput.focus();
        closeLatexKeyboard();
    }
}

/**
 * بستن کیبورد LaTeX
 */
function closeLatexKeyboard() {
    const modal = document.querySelector('.latex-keyboard-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * مقداردهی اولیه LaTeX
 */
document.addEventListener('DOMContentLoaded', function() {
    // اضافه کردن دکمه کیبورد LaTeX
    const inputTools = document.querySelector('.input-tools');
    if (inputTools) {
        const keyboardBtn = document.createElement('button');
        keyboardBtn.className = 'tool-btn';
        keyboardBtn.innerHTML = '<i class="fas fa-keyboard"></i>';
        keyboardBtn.title = 'کیبورد LaTeX';
        keyboardBtn.onclick = showLatexKeyboard;
        inputTools.appendChild(keyboardBtn);
    }
    
    // اضافه کردن استایل برای پیش‌نمایش LaTeX
    const style = document.createElement('style');
    style.textContent = `
        .latex-shortcut-btn:hover {
            background: rgba(67, 97, 238, 0.4) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 5px 15px rgba(67, 97, 238, 0.4) !important;
        }
        
        .latex-preview-item {
            transition: all 0.3s;
        }
        
        .latex-preview-item:hover {
            background: rgba(67, 97, 238, 0.2) !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('LaTeX system initialized successfully');
});
