// Sofortiges Einblenden bereits geladener Bilder
document.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalHeight !== 0) {
        img.classList.add('loaded');
    }
});

// Like-Button Funktionalität
function toggleLike(btn) {
    const isLiked = btn.classList.contains('liked');
    const countSpan = btn.querySelector('span');
    const svg = btn.querySelector('svg');
    let count = parseInt(countSpan.textContent);

    if (isLiked) {
        btn.classList.remove('liked');
        countSpan.textContent = count - 1;
        svg.style.fill = 'none';
        svg.style.stroke = 'currentColor';
    } else {
        btn.classList.add('liked');
        countSpan.textContent = count + 1;
        svg.style.fill = '#ff3b30';
        svg.style.stroke = '#ff3b30';
        
        // Kleiner Pop-Effekt
        btn.style.transform = 'scale(1.25)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 150);
    }
}

// Bottom-Navigation Active-State
function setActive(btn) {
    // Alle Buttons zurücksetzen
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('nav-active');
        b.classList.add('text-white/50');
        // Entferne evtl. vorhandenen Chevron (außer beim Original)
        const existing = b.querySelector('.nav-chevron');
        if (existing && b !== btn) existing.remove();
    });

    // Aktiven Button setzen
    btn.classList.add('nav-active');
    btn.classList.remove('text-white/50');

    // Chevron hinzufügen falls nicht vorhanden
    if (!btn.querySelector('.nav-chevron')) {
        const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chevron.setAttribute('class', 'nav-chevron');
        chevron.setAttribute('width', '12');
        chevron.setAttribute('height', '12');
        chevron.setAttribute('viewBox', '0 0 24 24');
        chevron.setAttribute('fill', 'none');
        chevron.setAttribute('stroke', 'currentColor');
        chevron.setAttribute('stroke-width', '3');
        chevron.setAttribute('stroke-linecap', 'round');
        chevron.setAttribute('stroke-linejoin', 'round');
        chevron.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
        btn.appendChild(chevron);
    }
}

// Zahlen-Animation beim Laden
window.addEventListener('DOMContentLoaded', () => {
    const counters = document.querySelectorAll('.stat-num');
    
    counters.forEach(counter => {
        const target = parseFloat(counter.dataset.target);
        const isFloat = counter.dataset.float === 'true';
        const duration = 800;
        const steps = 30;
        const increment = target / steps;
        let current = 0;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            current += increment;
            
            if (step >= steps) {
                current = target;
                clearInterval(timer);
            }
            
            counter.textContent = isFloat ? current.toFixed(1) : Math.floor(current);
        }, duration / steps);
    });
});

// Sanftes Nachladen von Bildern (Fallback)
document.addEventListener('load', (e) => {
    if (e.target.tagName === 'IMG') {
        e.target.classList.add('loaded');
    }
}, true);