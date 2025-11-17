const themes = ['theme1', 'theme2', 'theme3', 'theme4', 'theme5' ];
let currentThemeIndex = 0;

// استرجاع الثيم من localStorage إذا كان موجودًا
const savedTheme = localStorage.getItem('selectedTheme');
if (savedTheme && themes.includes(savedTheme)) {
    document.body.className = savedTheme;
    currentThemeIndex = themes.indexOf(savedTheme);
}

// عند الضغط على زر تغيير الثيم (مع حماية من غياب العنصر)
(function(){
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const newTheme = themes[currentThemeIndex];
        document.body.className = newTheme;
        localStorage.setItem('selectedTheme', newTheme);
    });
})();
