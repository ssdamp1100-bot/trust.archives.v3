const themes = ['theme1', 'theme2', 'theme3', 'theme4', 'theme5', 'theme6', 'theme7'];
let currentThemeIndex = 0;

// استرجاع الثيم من localStorage إذا كان موجودًا
const savedTheme = localStorage.getItem('selectedTheme');
if (savedTheme && themes.includes(savedTheme)) {
    document.body.className = savedTheme;
    currentThemeIndex = themes.indexOf(savedTheme);
}

// عند الضغط على زر تغيير الثيم
document.getElementById('theme-toggle').addEventListener('click', () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const newTheme = themes[currentThemeIndex];
    document.body.className = newTheme;
    localStorage.setItem('selectedTheme', newTheme); // حفظ الثيم المختار
});
