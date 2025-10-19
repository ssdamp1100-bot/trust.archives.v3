function generatePDF() {
    // Guards
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('مكتبة إنشاء PDF غير محملة.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Try to register an Arabic-capable font if provided via a separate VFS script
    (function setupArabicFont() {
        try {
            const font = window.pdfArabicFontVFS; // {name, file, data}
            if (font && font.data && font.file && font.name) {
                doc.addFileToVFS(font.file, font.data);
                doc.addFont(font.file, font.name, 'normal');
                doc.setFont(font.name, 'normal');
            }
        } catch (e) {
            // Fallback to default font
        }
    })();
    
    // Helper to draw RTL text aligned to the right margin
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightMargin = 15;
    const leftMargin = 20;
    function textRTL(txt, y, opts = {}) {
        const x = pageWidth - rightMargin;
        doc.text(String(txt || ''), x, y, { align: 'right', ...opts });
    }
    function paragraphRTL(txt, y, maxWidth = 170, lineHeight = 7) {
        const lines = doc.splitTextToSize(String(txt || ''), maxWidth);
        lines.forEach((ln, i) => textRTL(ln, y + i * lineHeight));
        return y + lines.length * lineHeight;
    }

    // Extract data from DOM (fallbacks if elements missing)
    const productName = (document.querySelector('.product-title')?.textContent || '').trim() || 'منتج';
    const category = (document.querySelectorAll('.product-meta .meta-item span')[0]?.textContent || '').trim();
    const description = (document.querySelector('.product-description')?.textContent || '').trim();
    const price = (document.querySelectorAll('.price-amount')[0]?.textContent || '').trim();
    const usesText = (document.querySelector('#description p')?.textContent || '').trim();
    const features = Array.from(document.querySelectorAll('#description ul li')).map(li => li.textContent.trim());
    const specs = [];
    document.querySelectorAll('.specs-grid .spec-item').forEach(item => {
        const name = item.querySelector('.spec-name').textContent.trim();
        const value = item.querySelector('.spec-value').textContent.trim();
        specs.push(`${name}: ${value}`);
    });

    // Add content to PDF (Arabic labels, RTL alignment)
    let yPos = 20; // Starting Y position

    doc.setFontSize(18);
    textRTL('تفاصيل المنتج', 20, { align: 'center' });
    yPos += 15;

    doc.setFontSize(14);
    textRTL(`اسم المنتج: ${productName}`, yPos);
    yPos += 10;

    textRTL(`الفئة: ${category}`, yPos);
    yPos += 10;

    textRTL('الوصف:', yPos);
    yPos += 7;
    doc.setFontSize(12);
    yPos = paragraphRTL(description, yPos, pageWidth - leftMargin - rightMargin);
    yPos += 5;

    doc.setFontSize(14);
    textRTL(`السعر (عام): ${price}`, yPos);
    yPos += 12;

    textRTL('الاستخدامات:', yPos);
    yPos += 7;
    doc.setFontSize(12);
    yPos = paragraphRTL(usesText, yPos, pageWidth - leftMargin - rightMargin);
    yPos += 5;

    doc.setFontSize(14);
    textRTL('الميزات الرئيسية:', yPos);
    yPos += 8;
    doc.setFontSize(12);
    features.forEach(feature => {
        textRTL(`- ${feature}`, yPos, { maxWidth: pageWidth - leftMargin - rightMargin });
        yPos += 7;
    });
    yPos += 3;

    doc.setFontSize(14);
    textRTL('المواصفات:', yPos);
    yPos += 8;
    specs.forEach(spec => {
        textRTL(`- ${spec}`, yPos, { maxWidth: pageWidth - leftMargin - rightMargin });
        yPos += 7;
    });

    // Collect image URLs from the page or currentProduct
    let imageUrls = [];
    try {
        const thumbs = Array.from(document.querySelectorAll('.image-thumbnails img'));
        if (thumbs.length) {
            imageUrls = thumbs.map(img => img.src).filter(Boolean);
        } else if (Array.isArray(window.currentProduct?.product_images)) {
            imageUrls = window.currentProduct.product_images.map(i => i.image_url).filter(Boolean);
        }
    } catch {}

    // Helper to fetch an image as base64
    async function loadImage(url) {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Add images asynchronously
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('مكتبة إنشاء PDF غير محملة.');
        return;
    }
    (async () => {
        if (imageUrls.length) {
            for (let i = 0; i < imageUrls.length; i++) {
                if (yPos > 250) { // Add new page if needed
                    doc.addPage();
                    yPos = 20;
                }
                try {
                    const base64 = await loadImage(imageUrls[i]);
                    // Place image on the left side to match RTL text block on the right
                    doc.addImage(base64, 'JPEG', leftMargin, yPos, 80, 60);
                    yPos += 65;
                } catch (error) {
                    console.error('Error loading image:', error);
                }
            }
        }
        doc.save(`${productName}.pdf`);
    })();
}