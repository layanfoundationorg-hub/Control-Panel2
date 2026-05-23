/**
 * Public Site Logic - Layan Platform
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Layan Platform Loaded');

    loadStats();
    loadNews();
    setupHeaderScroll();
});

/* =========================
   HEADER EFFECT
========================= */
function setupHeaderScroll() {
    const header = document.querySelector('header');

    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('py-2', 'shadow-md');
            header.classList.remove('py-4', 'shadow-sm');
        } else {
            header.classList.add('py-4', 'shadow-sm');
            header.classList.remove('py-2', 'shadow-md');
        }
    });
}

/* =========================
   LOAD STATS
========================= */
async function loadStats() {

    try {

        const cachedStats = localStorage.getItem('layan_stats');

        if (cachedStats) {
            renderStats(JSON.parse(cachedStats));
        }

        const data = await API.get('getStats');

        if (data && !data.error) {
            localStorage.setItem('layan_stats', JSON.stringify(data));
            renderStats(data);
        }

    } catch (error) {
        console.error('Stats Error:', error);
    }
}

function renderStats(data) {

    const statsMap = {
        'المشاريع': 'stat-projects',
        'المستفيدين': 'stat-beneficiaries',
        'المبادرات': 'stat-initiatives',
        'المتطوعين': 'stat-volunteers'
    };

    data.forEach(stat => {

        const id = statsMap[stat.Label];

        if (id) {

            const element = document.getElementById(id);

            if (element) {
                element.innerText =
                    Number(stat.Value).toLocaleString();
            }
        }
    });
}

/* =========================
   LOAD NEWS
========================= */
async function loadNews() {

    const newsContainer =
        document.getElementById('news-container');

    if (!newsContainer) return;

    try {

        // عرض مؤقت أثناء التحميل
        newsContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <div class="animate-pulse text-slate-400">
                    جاري تحميل الأخبار...
                </div>
            </div>
        `;

        // Cache
        const cachedNews =
            localStorage.getItem('layan_news');

        if (cachedNews) {
            renderNews(JSON.parse(cachedNews));
        }

        console.log('Fetching news...');

        const news = await API.get('getNews');

        console.log('News received:', news);

        if (
            news &&
            Array.isArray(news) &&
            news.length > 0
        ) {

            localStorage.setItem(
                'layan_news',
                JSON.stringify(news)
            );

            renderNews(news);

        } else {

            newsContainer.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-400">
                    <i class="fas fa-newspaper text-5xl mb-4 opacity-20"></i>
                    <p>لا توجد أخبار منشورة حالياً.</p>
                </div>
            `;
        }

    } catch (error) {

        console.error('News Error:', error);

        newsContainer.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-400">
                حدث خطأ أثناء تحميل الأخبار
            </div>
        `;
    }
}

/* =========================
   FIX GOOGLE DRIVE IMAGE URL
========================= */
function fixDriveUrl(url) {

    if (!url || url.trim() === '' || url === 'undefined') {
        return 'https://placehold.co/800x450/e2e8f0/94a3b8?text=Layan+News';
    }

    try {
        // Extract file ID from any Google Drive URL format
        let fileId = null;

        // Format: lh3.googleusercontent.com/d/FILE_ID
        const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?&=]+)/);
        if (lh3Match) fileId = lh3Match[1];

        // Format: drive.google.com/file/d/FILE_ID/
        if (!fileId) {
            const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
            if (driveMatch) fileId = driveMatch[1];
        }

        // Format: id=FILE_ID
        if (!fileId) {
            const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
            if (idMatch) fileId = idMatch[1];
        }

        // Format: bare file ID (any long alphanumeric string)
        if (!fileId) {
            const bareMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
            if (bareMatch) fileId = bareMatch[1];
        }

        if (fileId) {
            // Use thumbnail API - most reliable for public Drive files
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
        }

        return url;

    } catch (error) {
        console.error('Image URL Error:', error);
        return 'https://placehold.co/800x450/e2e8f0/94a3b8?text=Image+Error';
    }
}

/* =========================
   RENDER NEWS
========================= */
function renderNews(news) {

    const newsContainer =
        document.getElementById('news-container');

    if (!newsContainer) return;

    // Store all news in localStorage for detail page
    localStorage.setItem('layan_all_news', JSON.stringify(news));

    newsContainer.innerHTML = news
        .slice(0, 3)
        .map((item, index) => {

            const imageUrl = fixDriveUrl(item.Images);
            const newsId = encodeURIComponent(item.Title || index);

            return `
            <div class="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl transition-all group">

                <div class="relative h-56 overflow-hidden bg-slate-100">

                    <img
                        src="${imageUrl}"
                        alt="${item.Title || 'News Image'}"
                        class="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                        loading="lazy"
                        onerror="
                            this.onerror=null;
                            this.src='https://placehold.co/800x450/e2e8f0/94a3b8?text=Layan';
                        "
                    >

                    <div class="absolute top-4 right-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        ${item.Category || 'أخبار'}
                    </div>

                </div>

                <div class="p-6">

                    <div class="text-slate-400 text-xs mb-3 flex items-center gap-2">
                        <i class="far fa-calendar-alt"></i>
                        ${item.Date || ''}
                    </div>

                    <h4 class="text-xl font-bold text-slate-900 mb-3 line-clamp-2">
                        ${item.Title || ''}
                    </h4>

                    <p class="text-slate-600 text-sm mb-6 line-clamp-3">
                        ${item.Content || ''}
                    </p>

                    <a
                        href="news.html?id=${newsId}"
                        class="text-blue-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all"
                    >
                        اقرأ المزيد
                        <i class="fas fa-arrow-left"></i>
                    </a>

                </div>
            </div>
        `;
        })
        .join('');
}

/* =========================
   SMOOTH SCROLL
========================= */
document.querySelectorAll('a[href^="#"]')
    .forEach(anchor => {

        anchor.addEventListener('click', function (e) {

            e.preventDefault();

            const target =
                document.querySelector(
                    this.getAttribute('href')
                );

            if (target) {

                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });