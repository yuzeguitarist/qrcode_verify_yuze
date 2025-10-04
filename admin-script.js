/**
 * 管理后台脚本
 * 功能：管理验证码、查看统计、验证日志
 */

// Supabase配置 - 与前端相同
const SUPABASE_URL = 'https://exyayqtajrnmwusetirb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eWF5cXRhanJubXd1c2V0aXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDAwMzUsImV4cCI6MjA3NTA3NjAzNX0.pAd8eoKtlVtAwIsvJqC2Wm9VghhPYd7sJhDGLkatn3w';

// 初始化Supabase客户端
let supabase;
let currentUser = null;

// 分页状态
let currentPage = 1;
let pageSize = 20;
let currentLogPage = 1;
let currentFilter = 'all';
let currentLogFilter = 'all';

/**
 * 初始化
 */
window.addEventListener('DOMContentLoaded', async function() {
    // 初始化Supabase
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase客户端初始化成功');
        
        // 检查是否已登录
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            showAdminPanel();
        }
    } else {
        console.error('❌ Supabase库未加载');
    }
});

/**
 * 登录处理
 */
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    if (!email || !password) {
        showError(errorEl, '请输入邮箱和密码');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            showError(errorEl, '登录失败：' + error.message);
            return;
        }
        
        currentUser = data.user;
        showAdminPanel();
        
    } catch (error) {
        console.error('登录错误:', error);
        showError(errorEl, '登录过程中发生错误');
    }
}

/**
 * 退出登录
 */
async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('adminContainer').classList.add('hidden');
    
    // 清空表单
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

/**
 * 显示管理面板
 */
function showAdminPanel() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('adminContainer').classList.remove('hidden');
    
    // 显示用户邮箱
    document.getElementById('adminEmail').textContent = currentUser.email;
    
    // 加载仪表板数据
    switchTab('dashboard');
}

/**
 * 切换标签
 */
function switchTab(tabName) {
    // 更新标签样式
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event?.target?.classList.add('active');
    
    // 隐藏所有内容
    document.querySelectorAll('.content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 显示对应内容
    const contentId = tabName + 'Content';
    document.getElementById(contentId).classList.remove('hidden');
    
    // 加载对应数据
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'codes':
            loadCodes();
            break;
        case 'logs':
            loadLogs();
            break;
        case 'stats':
            loadDailyStats();
            break;
    }
}

/**
 * 加载仪表板
 */
async function loadDashboard() {
    try {
        const { data, error } = await supabase.rpc('get_system_statistics');
        
        if (error) {
            console.error('获取统计失败:', error);
            return;
        }
        
        // 更新统计数据
        document.getElementById('totalCodes').textContent = data.total_codes || 0;
        document.getElementById('activatedCodes').textContent = data.activated_codes || 0;
        document.getElementById('pendingCodes').textContent = data.pending_codes || 0;
        document.getElementById('activationRate').textContent = (data.activation_rate || 0) + '%';
        document.getElementById('todayVerifications').textContent = data.today_verifications || 0;
        document.getElementById('todayActivations').textContent = data.today_activations || 0;
        
    } catch (error) {
        console.error('加载仪表板错误:', error);
    }
}

/**
 * 刷新统计
 */
function refreshStats() {
    loadDashboard();
}

/**
 * 加载验证码列表
 */
async function loadCodes() {
    const tbody = document.getElementById('codesTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">加载中...</td></tr>';
    
    try {
        let query = supabase
            .from('authorization_codes')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
        
        // 应用过滤
        if (currentFilter === 'activated') {
            query = query.eq('activated', true);
        } else if (currentFilter === 'pending') {
            query = query.eq('activated', false);
        }
        
        const { data, error, count } = await query;
        
        if (error) {
            console.error('获取验证码失败:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="loading">加载失败</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">暂无数据</td></tr>';
            return;
        }
        
        // 渲染表格
        tbody.innerHTML = data.map(code => `
            <tr>
                <td><strong>${code.code}</strong></td>
                <td>${formatDateTime(code.created_at)}</td>
                <td><span class="status-badge ${code.activated ? 'activated' : ''}">${code.activated ? '已激活' : '未激活'}</span></td>
                <td>${code.activation_date ? formatDateTime(code.activation_date) : '-'}</td>
                <td>${code.activation_count || 0}</td>
                <td>
                    <button class="btn btn-secondary" onclick="viewCodeDetail('${code.code}')">详情</button>
                </td>
            </tr>
        `).join('');
        
        // 更新分页信息
        const totalPages = Math.ceil(count / pageSize);
        document.getElementById('pageInfo').textContent = `第 ${currentPage} / ${totalPages} 页`;
        
    } catch (error) {
        console.error('加载验证码错误:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading">加载错误</td></tr>';
    }
}

/**
 * 搜索验证码
 */
async function searchCodes() {
    const searchTerm = document.getElementById('searchCode').value.trim().toUpperCase();
    
    if (!searchTerm) {
        loadCodes();
        return;
    }
    
    const tbody = document.getElementById('codesTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">搜索中...</td></tr>';
    
    try {
        const { data, error } = await supabase
            .from('authorization_codes')
            .select('*')
            .ilike('code', `%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('搜索失败:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="loading">搜索失败</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">未找到匹配的验证码</td></tr>';
            return;
        }
        
        // 渲染结果
        tbody.innerHTML = data.map(code => `
            <tr>
                <td><strong>${code.code}</strong></td>
                <td>${formatDateTime(code.created_at)}</td>
                <td><span class="status-badge ${code.activated ? 'activated' : ''}">${code.activated ? '已激活' : '未激活'}</span></td>
                <td>${code.activation_date ? formatDateTime(code.activation_date) : '-'}</td>
                <td>${code.activation_count || 0}</td>
                <td>
                    <button class="btn btn-secondary" onclick="viewCodeDetail('${code.code}')">详情</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('搜索错误:', error);
    }
}

/**
 * 过滤验证码
 */
function filterCodes() {
    currentFilter = document.getElementById('filterStatus').value;
    currentPage = 1;
    loadCodes();
}

/**
 * 查看验证码详情
 */
async function viewCodeDetail(code) {
    try {
        const { data, error } = await supabase
            .from('authorization_codes')
            .select('*')
            .eq('code', code)
            .single();
        
        if (error) {
            alert('获取详情失败');
            return;
        }
        
        const detail = `
验证码: ${data.code}
创建时间: ${formatDateTime(data.created_at)}
状态: ${data.activated ? '已激活' : '未激活'}
激活时间: ${data.activation_date ? formatDateTime(data.activation_date) : '未激活'}
验证次数: ${data.activation_count || 0}
最后验证: ${data.last_verified_at ? formatDateTime(data.last_verified_at) : '-'}
备注: ${data.notes || '无'}
        `;
        
        alert(detail);
        
    } catch (error) {
        console.error('查看详情错误:', error);
    }
}

/**
 * 导出CSV
 */
async function exportCodes() {
    try {
        const { data, error } = await supabase
            .from('authorization_codes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            alert('导出失败');
            return;
        }
        
        // 生成CSV
        const csv = [
            ['验证码', '创建时间', '状态', '激活时间', '验证次数'].join(','),
            ...data.map(code => [
                code.code,
                formatDateTime(code.created_at),
                code.activated ? '已激活' : '未激活',
                code.activation_date ? formatDateTime(code.activation_date) : '',
                code.activation_count || 0
            ].join(','))
        ].join('\n');
        
        // 下载
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `验证码_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
    } catch (error) {
        console.error('导出错误:', error);
    }
}

/**
 * 加载验证日志
 */
async function loadLogs() {
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">加载中...</td></tr>';
    
    try {
        let query = supabase
            .from('verification_logs')
            .select('*', { count: 'exact' })
            .order('verified_at', { ascending: false })
            .range((currentLogPage - 1) * pageSize, currentLogPage * pageSize - 1);
        
        // 应用过滤
        if (currentLogFilter !== 'all') {
            query = query.eq('result', currentLogFilter);
        }
        
        const { data, error, count } = await query;
        
        if (error) {
            console.error('获取日志失败:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="loading">加载失败</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">暂无数据</td></tr>';
            return;
        }
        
        // 渲染表格
        tbody.innerHTML = data.map(log => `
            <tr>
                <td><strong>${log.code}</strong></td>
                <td>${formatDateTime(log.verified_at)}</td>
                <td><span class="status-badge ${log.result === 'success' ? 'success' : 'failed'}">${log.result === 'success' ? '成功' : '失败'}</span></td>
                <td>${log.client_ip || '-'}</td>
            </tr>
        `).join('');
        
        // 更新分页信息
        const totalPages = Math.ceil(count / pageSize);
        document.getElementById('logPageInfo').textContent = `第 ${currentLogPage} / ${totalPages} 页`;
        
    } catch (error) {
        console.error('加载日志错误:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="loading">加载错误</td></tr>';
    }
}

/**
 * 过滤日志
 */
function filterLogs() {
    currentLogFilter = document.getElementById('filterResult').value;
    currentLogPage = 1;
    loadLogs();
}

/**
 * 刷新日志
 */
function refreshLogs() {
    loadLogs();
}

/**
 * 加载每日统计
 */
async function loadDailyStats() {
    const tbody = document.getElementById('dailyStatsBody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading">加载中...</td></tr>';
    
    try {
        const { data, error } = await supabase
            .from('system_stats')
            .select('*')
            .order('stat_date', { ascending: false })
            .limit(30);
        
        if (error) {
            console.error('获取统计失败:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="loading">加载失败</td></tr>';
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">暂无数据</td></tr>';
            return;
        }
        
        // 渲染表格
        tbody.innerHTML = data.map(stat => `
            <tr>
                <td>${stat.stat_date}</td>
                <td>${stat.total_codes || 0}</td>
                <td>${stat.activated_codes || 0}</td>
                <td>${stat.daily_verifications || 0}</td>
                <td>${stat.daily_activations || 0}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('加载统计错误:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="loading">加载错误</td></tr>';
    }
}

/**
 * 分页控制
 */
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadCodes();
    }
}

function nextPage() {
    currentPage++;
    loadCodes();
}

function prevLogPage() {
    if (currentLogPage > 1) {
        currentLogPage--;
        loadLogs();
    }
}

function nextLogPage() {
    currentLogPage++;
    loadLogs();
}

/**
 * 工具函数
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

// 回车登录
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
});
