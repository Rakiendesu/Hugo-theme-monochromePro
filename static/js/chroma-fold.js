document.addEventListener('DOMContentLoaded', function() {
    const codeBlocks = document.querySelectorAll('.highlight');



    codeBlocks.forEach(block => {
        const pre = block.querySelector('pre');
        const code = block.querySelector('code');
        if (!pre || !code) return;

// 动态生成行号（不影响复制）
const lines = code.querySelectorAll('.line');
lines.forEach((line, i) => {
    const num = document.createElement('span');
    num.className = 'code-line-num';
    num.textContent = i + 1;
    line.insertBefore(num, line.firstChild);
});

        // 1. 获取语言 (Hugo 通常把语言放在 code 的 class 里)
        let lang = 'CODE';
        const langClass = Array.from(code.classList).find(c => c.startsWith('language-'));
        if (langClass) lang = langClass.replace('language-', '');

        // 2. 创建顶部工具栏
        const tools = document.createElement('div');
        tools.className = 'code-tools';
        tools.innerHTML = `
            <span class="code-lang-name">${lang}</span>
            <button class="copy-btn">复制</button>
        `;
        block.insertBefore(tools, pre);

        // 3. 复制逻辑
const copyBtn = tools.querySelector('.copy-btn');
copyBtn.addEventListener('click', () => {
    const clone = code.cloneNode(true);
    // 移除所有行号元素（Chroma 原生 + 动态生成的）
    clone.querySelectorAll('.ln, .lnt, .lnlinks, .lntd:first-child, .code-line-num').forEach(el => el.remove());

    const textToCopy = clone.innerText.trim();
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.innerText = '✅ 复制成功';
        copyBtn.style.background = '#4CAF50';
        copyBtn.style.borderColor = '#4CAF50';
        copyBtn.style.color = '#fff';
        setTimeout(() => {
            copyBtn.innerText = '复制';
            copyBtn.style = '';
        }, 2000);
    });
});

// 4. 折叠逻辑
const lineCount = code.textContent.split('\n').length;
if (lineCount > 12) {
    // 初始状态：折叠，禁止滚动
    pre.style.overflow = 'hidden';
    
    const overlay = document.createElement('div');
    overlay.className = 'fold-overlay';
    overlay.innerHTML = '<span class="fold-text">展开全部内容</span>';
    block.appendChild(overlay);

    overlay.addEventListener('click', () => {
        if (block.classList.contains('expanded')) {
            // 收起
            block.classList.remove('expanded');
            overlay.querySelector('.fold-text').innerText = '展开全部内容';
            pre.style.overflow = 'hidden';  // 禁止滚动
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // 展开
            block.classList.add('expanded');
            overlay.querySelector('.fold-text').innerText = '收起代码';
            pre.style.overflow = 'auto';    // 允许滚动
        }
    });
}
    });
});

