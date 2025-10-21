/**
 * 乐谱验证系统 - 前端脚本 - Supabase版本
 * 功能:验证授权码、显示验证结果
 */

// Supabase配置 - 需要替换为实际的项目配置
const SUPABASE_URL = 'https://eakahyljpgdoreeuzrnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVha2FoeWxqcGdkb3JlZXV6cm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNDIzMzMsImV4cCI6MjA3NjYxODMzM30.u_ieJuot-XKKXZU0TTjZZ_BBs0qG0zNCukJm8ovqfqY';

// 初始化Supabase客户端
let supabase;

// 验证器类
class BookVerifier {
    constructor() {
        this.initSupabase();
        this.init();
    }

    /**
     * 初始化Supabase客户端
     */
    initSupabase() {
        try {
            if (typeof supabase === 'undefined' && window.supabase) {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase客户端初始化成功');
            }
        } catch (error) {
            console.error('❌ Supabase初始化失败:', error);
            this.showNetworkError();
        }
    }

    /**
     * 初始化页面
     */
    init() {
        // 从URL获取验证码
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            // 自动验证
            this.verifyCode(code);
        } else {
            // 显示手动输入界面
            this.showManualInput();
        }
    }

    /**
     * 验证授权码
     * @param {string} code - 授权码
     */
    async verifyCode(code) {
        // 显示加载状态
        this.showLoading('正在验证授权码...');

        try {
            // 调用Supabase RPC函数验证
            const { data, error } = await supabase.rpc('public_verify_code', {
                p_code: code.toUpperCase()
            });

            if (error) {
                console.error('验证错误:', error);
                this.showInvalid('验证过程中发生错误');
                return;
            }

            console.log('验证结果:', data);

            // 处理验证结果
            if (data && data.success) {
                this.showValid(data.data);
            } else {
                this.showInvalid(data?.message || '授权码无效');
            }

        } catch (error) {
            console.error('网络错误:', error);
            this.showNetworkError();
        }
    }

    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     */
    showLoading(message = '正在验证中...') {
        this.hideAllCards();
        const loadingCard = document.getElementById('loadingCard');
        const loadingDetail = document.getElementById('loadingDetail');
        
        loadingDetail.textContent = message;
        loadingCard.classList.remove('hidden');
    }

    /**
     * 显示验证成功
     * @param {object} codeInfo - 授权码信息
     */
    showValid(codeInfo) {
        this.hideAllCards();
        
        const validCard = document.getElementById('validCard');
        const codeDisplay = document.getElementById('codeDisplay');
        const verifyTime = document.getElementById('verifyTime');
        const activationStatus = document.getElementById('activationStatus');
        const activationInfo = document.getElementById('activationInfo');
        const activationTime = document.getElementById('activationTime');
        const activationCount = document.getElementById('activationCount');
        const purchaseTypeInfo = document.getElementById('purchaseTypeInfo');

        // 填充数据
        codeDisplay.textContent = codeInfo.code;
        verifyTime.textContent = this.formatDateTime(new Date());
        
        // 检查是否为共享验证码(电子版)
        if (codeInfo.is_shared || codeInfo.code_type === 'digital') {
            // 显示电子版特殊提示
            if (purchaseTypeInfo) {
                purchaseTypeInfo.classList.remove('hidden');
                purchaseTypeInfo.innerHTML = `
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                padding: 15px; 
                                border-radius: 10px; 
                                margin: 15px 0; 
                                color: white;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <p style="margin: 0; font-size: 16px; font-weight: bold;">
                            🎵 电子版乐谱
                        </p>
                        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">
                            此为从个人网站购买的正版电子版本
                        </p>
                    </div>
                `;
            }
            activationStatus.textContent = '电子版 - 已验证';
            activationStatus.style.color = '#667eea';
            activationStatus.style.fontWeight = 'bold';
        } else {
            // 实体版验证码
            if (codeInfo.is_first_activation) {
                activationStatus.textContent = '首次激活';
                activationStatus.style.color = '#000000';
                activationStatus.style.fontWeight = 'bold';
            } else {
                activationStatus.textContent = '已激活';
            }
        }

        // 显示激活信息
        if (codeInfo.activation_date) {
            activationInfo.classList.remove('hidden');
            activationTime.textContent = this.formatDateTime(new Date(codeInfo.activation_date));
            activationCount.textContent = codeInfo.activation_count || 1;
        }

        validCard.classList.remove('hidden');
    }

    /**
     * 显示验证失败
     * @param {string} message - 错误消息
     */
    showInvalid(message = '此验证码无效或不存在') {
        this.hideAllCards();
        
        const invalidCard = document.getElementById('invalidCard');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        invalidCard.classList.remove('hidden');
    }

    /**
     * 显示网络错误
     */
    showNetworkError() {
        this.hideAllCards();
        document.getElementById('networkErrorCard').classList.remove('hidden');
    }

    /**
     * 显示手动输入界面
     */
    showManualInput() {
        this.hideAllCards();
        document.getElementById('manualInputCard').classList.remove('hidden');
        
        // 聚焦输入框
        setTimeout(() => {
            const input = document.getElementById('manualCodeInput');
            if (input) {
                input.focus();
            }
        }, 100);
    }

    /**
     * 隐藏所有卡片
     */
    hideAllCards() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => card.classList.add('hidden'));
    }

    /**
     * 格式化日期时间
     * @param {Date} date - 日期对象
     * @returns {string} 格式化的日期时间字符串
     */
    formatDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
}

/**
 * 手动验证验证码
 */
function verifyManualCode() {
    const input = document.getElementById('manualCodeInput');
    const code = input.value.trim();

    if (!code) {
        alert('请输入验证码');
        return;
    }

    if (code.length < 8 || code.length > 20) {
        alert('验证码长度应该在8-20位之间');
        return;
    }

    // 更新URL并验证
    const newUrl = `${window.location.pathname}?code=${encodeURIComponent(code)}`;
    window.history.pushState({}, '', newUrl);
    
    // 验证
    window.verifier.verifyCode(code);
}

/**
 * 显示主卡片(从手动输入返回)
 */
function showMainCards() {
    // 清除URL参数
    window.history.pushState({}, '', window.location.pathname);
    
    // 显示手动输入
    window.verifier.showManualInput();
}

/**
 * 处理输入框回车事件
 */
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('manualCodeInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyManualCode();
            }
        });
    }
});

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 检查Supabase配置
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('❌ Supabase配置未设置');
        document.getElementById('loadingCard').innerHTML = `
            <div class="error-icon">×</div>
            <h2>配置错误</h2>
            <p>Supabase配置未正确设置</p>
            <p class="note">请在script.js中配置SUPABASE_URL和SUPABASE_ANON_KEY</p>
        `;
        return;
    }

    // 等待Supabase库加载
    if (typeof window.supabase === 'undefined') {
        console.log('等待Supabase库加载...');
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof window.supabase !== 'undefined') {
                clearInterval(checkInterval);
                console.log('✅ Supabase库加载完成');
                window.verifier = new BookVerifier();
            } else if (attempts > 50) {
                clearInterval(checkInterval);
                console.error('❌ Supabase库加载超时');
                document.getElementById('loadingCard').innerHTML = `
                    <div class="error-icon">×</div>
                    <h2>加载错误</h2>
                    <p>无法加载Supabase库</p>
                    <button class="btn btn-primary" onclick="location.reload()">刷新页面</button>
                `;
            }
        }, 100);
    } else {
        // 直接初始化
        window.verifier = new BookVerifier();
    }
});

// 导出验证器类供外部使用
window.BookVerifier = BookVerifier;
