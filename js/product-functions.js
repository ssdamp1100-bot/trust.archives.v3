// Product Functions - وظائف صفحة المنتج

// وظيفة التبويبات
document.addEventListener('DOMContentLoaded', function () {
    // معالج التبويبات
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // إزالة الكلاس النشط من جميع الأزرار والمحتوى
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // إضافة الكلاس النشط للزر والمحتوى المطابق
            button.classList.add('active');
            const tabId = button.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });

    // معالج الصور المصغرة
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            const mainImage = document.getElementById('mainImage');
            if (mainImage) {
                mainImage.src = thumb.dataset.image;
            }
        });
    });

    // معالج زر الاقتباس
    const quoteBtn = document.getElementById('quoteBtn');
    if (quoteBtn) {
        quoteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            alert('هذه الخاصية قيد التطوير');
        });
    }

    // معالج زر المشاركة
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }
});

// وظيفة المشاركة
function handleShare() {
    const productTitle = document.querySelector('.product-title')?.textContent || 'منتج - أرشيف الثقة التجارية';
    const productDesc = document.querySelector('.product-description')?.textContent || 'اكتشف هذا المنتج المتميز';

    if (navigator.share) {
        navigator.share({
            title: productTitle,
            text: productDesc,
            url: window.location.href
        })
            .then(() => console.log('تم المشاركة بنجاح'))
            .catch(error => console.log('Error sharing:', error));
    } else {
        alert('ميزة المشاركة غير مدعومة في متصفحك. يمكنك نسخ الرابط من شريط العنوان.');
    }
}
