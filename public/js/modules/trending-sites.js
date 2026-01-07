/**
 * 실시간 트렌드 URL 모듈
 * API에서 트렌드 데이터를 가져와 표시
 */

export function createTrendingSites() {
    const trendingList = document.getElementById('trendingList');
    const locale = document.documentElement.lang || 'ko';

    let isLoading = false;

    // 트렌드 URL 로드
    async function loadTrendingUrls() {
        if (isLoading) return;
        isLoading = true;

        try {
            const response = await fetch(`/api/trending-urls?locale=${locale}&limit=5`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            displayTrendingUrls(data.trending);
        } catch (error) {
            console.error('Failed to load trending URLs:', error);
            showEmptyState();
        } finally {
            isLoading = false;
        }
    }

    // 트렌드 URL 표시
    function displayTrendingUrls(trending) {
        if (!trending || trending.length === 0) {
            showEmptyState();
            return;
        }

        const html = trending.map((item, index) => `
      <div class="trending-item" data-url="${escapeHtml(item.url)}" data-name="${escapeHtml(item.name)}">
        <div class="trending-rank">${index + 1}</div>
        <div class="trending-info">
          <div class="trending-name">${escapeHtml(item.name)}</div>
          <div class="trending-url">${escapeHtml(item.url)}</div>
        </div>
        <div class="trending-count">${item.count}${getCountLabel()}</div>
      </div>
    `).join('');

        trendingList.innerHTML = html;

        // 클릭 이벤트 추가
        const items = trendingList.querySelectorAll('.trending-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                const name = item.dataset.name;
                handleTrendingClick(url, name);
            });
        });
    }

    // 빈 상태 표시
    function showEmptyState() {
        const messages = {
            ko: '아직 데이터가 충분하지 않습니다.<br>URL을 입력해서 시간을 확인해보세요!',
            en: 'Not enough data yet.<br>Try checking a URL to get started!',
            ja: 'まだデータが不足しています。<br>URLを入力して時間を確認してみてください！',
            'zh-tw': '資料尚不足夠。<br>請輸入URL來確認時間！'
        };

        trendingList.innerHTML = `
      <div class="trending-empty">
        ${messages[locale] || messages.en}
      </div>
    `;
    }

    // 트렌드 항목 클릭 처리
    function handleTrendingClick(url, name) {
        const urlInput = document.getElementById('urlInput');
        const checkButton = document.getElementById('checkBtn');

        if (urlInput && checkButton) {
            // URL 입력 필드에 자동 입력
            urlInput.value = url;
            urlInput.focus();

            // 자동으로 시간 확인 트리거
            setTimeout(() => {
                checkButton.click();
            }, 100);

            console.log(`✅ Trending site selected: ${name} (${url})`);
        }
    }

    // HTML 이스케이프
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 카운트 라벨 (다국어)
    function getCountLabel() {
        const labels = {
            ko: '회',
            en: ' checks',
            ja: '回',
            'zh-tw': '次'
        };
        return labels[locale] || labels.en;
    }

    // 초기화
    function init() {
        if (!trendingList) {
            console.warn('Trending list element not found');
            return;
        }

        // 즉시 로드
        loadTrendingUrls();

        // 5분마다 자동 새로고침
        setInterval(loadTrendingUrls, 5 * 60 * 1000);
    }

    return {
        init,
        refresh: loadTrendingUrls
    };
}
