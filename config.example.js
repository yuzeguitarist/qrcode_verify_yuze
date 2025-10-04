/**
 * 前端配置文件示例
 * 
 * 使用方法：
 * 1. 复制此文件内容到 script.js 的开头
 * 2. 替换为你的实际Supabase配置
 * 3. 或者直接在script.js中修改配置常量
 */

// Supabase配置
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

// 注意：
// 1. SUPABASE_URL 可以在 Supabase Dashboard -> Settings -> API 中找到
// 2. SUPABASE_ANON_KEY 是 anon/public key，可以安全地暴露在前端
// 3. 不要在前端使用 service_role key！
