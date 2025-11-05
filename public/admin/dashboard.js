/**
 * Admin Dashboard
 * 분석 데이터를 시각화하는 대시보드
 */

const API_BASE = '/api';
let autoRefreshInterval = null;
let charts = {};

// 토큰 가져오기 (URL 쿼리 파라미터에서)
function getAdminToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || localStorage.getItem('adminToken') || '';
}

// 토큰 저장
function saveAdminToken(token) {
  localStorage.setItem('adminToken', token);
}

// API 호출 (토큰 포함)
async function fetchAnalytics(endpoint, options = {}) {
  const token = getAdminToken();

  if (!token) {
    throw new Error('인증 토큰이 없습니다. URL에 ?token=YOUR_TOKEN을 추가해주세요.');
  }

  const url = new URL(`${API_BASE}/analytics/${endpoint}`, window.location.origin);

  // 쿼리 파라미터 추가
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url, {
    headers: {
      'X-Admin-Token': token
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('인증 실패: 토큰이 올바르지 않습니다.');
    }
    throw new Error(`API 오류: ${response.status}`);
  }

  return await response.json();
}

// 대시보드 새로고침
async function refreshDashboard() {
  try {
    const token = getAdminToken();
    if (!token) {
      showError('토큰이 필요합니다. URL에 ?token=YOUR_TOKEN을 추가하거나 입력해주세요.');
      return;
    }

    // 토큰 저장 (URL에서 제거 가능하게)
    saveAdminToken(token);

    hideError();
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();

    // 모든 데이터 동시에 로드
    const [summary, urls] = await Promise.all([
      fetchAnalytics('summary'),
      fetchAnalytics('urls', { params: { limit: 10 } })
    ]);

    updateKpis(summary);
    updateCharts(summary);
    updatePerformance(summary);
    updateUrlsTable(urls);

    showSuccess('대시보드가 업데이트되었습니다.');
  } catch (err) {
    console.error('Dashboard refresh failed:', err);
    showError(err.message);
  }
}

function updateKpis(summary) {
  const users = summary.users || {};
  const events = summary.events || [];
  const performance = summary.performance || {};

  // 사용자 관련
  document.getElementById('totalUsers').textContent = users.total || 0;
  document.getElementById('totalRegions').textContent = users.regions || 0;
  document.getElementById('totalVisits').textContent = users.total_visits || 0;
  document.getElementById('avgVisits').textContent = (users.avg_visits_per_user || 0).toFixed(1);

  // 이벤트 관련
  const totalEvents = events.reduce((sum, e) => sum + (e.count || 0), 0);
  const errorEvents = events
    .filter((e) => e.type === 'check_time_error' || e.type === 'network_error')
    .reduce((sum, e) => sum + (e.count || 0), 0);

  document.getElementById('totalEvents').textContent = totalEvents;
  document.getElementById('errorCount').textContent = errorEvents;

  // 성능 관련
  const avgLatency = performance.avg_latency_ms || 0;
  document.getElementById('avgLatency').textContent = avgLatency > 0 ? `${avgLatency.toFixed(0)}ms` : '-';
  document.getElementById('slowEvents').textContent =
    performance.slow_events || 0;
}

function updateCharts(summary) {
  updateEventChart(summary.events || []);
  updateDeviceChart(summary.devices || []);
}

function updateEventChart(events) {
  const ctx = document.getElementById('eventChart');
  const data = {
    labels: events.map((e) => e.type),
    datasets: [
      {
        data: events.map((e) => e.count),
        backgroundColor: [
          '#1f3c88',
          '#2d5aa8',
          '#3d7abc',
          '#4d9adc',
          '#5dbafc',
          '#7dcaff'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  };

  if (charts.eventChart) {
    charts.eventChart.data = data;
    charts.eventChart.update();
  } else {
    charts.eventChart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

function updateDeviceChart(devices) {
  const ctx = document.getElementById('deviceChart');
  const data = {
    labels: devices.map((d) => d.type || 'Unknown'),
    datasets: [
      {
        label: '사용자 수',
        data: devices.map((d) => d.users || 0),
        backgroundColor: '#1f3c88',
        borderColor: '#fff',
        borderWidth: 2
      },
      {
        label: '세션 수',
        data: devices.map((d) => d.sessions || 0),
        backgroundColor: '#2d5aa8',
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  };

  if (charts.deviceChart) {
    charts.deviceChart.data = data;
    charts.deviceChart.update();
  } else {
    charts.deviceChart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}

function updatePerformance(summary) {
  const perf = summary.performance || {};

  document.getElementById('minLatency').textContent = perf.min_latency_ms
    ? `${perf.min_latency_ms.toFixed(0)}ms`
    : '-';
  document.getElementById('maxLatency').textContent = perf.max_latency_ms
    ? `${perf.max_latency_ms.toFixed(0)}ms`
    : '-';

  // 오류율 계산
  const totalEvents = perf.total_events || 0;
  const errorRate =
    totalEvents > 0
      ? (((perf.slow_events || 0) / totalEvents) * 100).toFixed(1)
      : '-';
  document.getElementById('errorRate').textContent =
    errorRate !== '-' ? `${errorRate}%` : '-';

  document.getElementById('sessionCount').textContent = perf.unique_sessions || 0;
}

function updateUrlsTable(urls) {
  const tbody = document.getElementById('urlTableBody');

  if (!urls || urls.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">데이터가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = urls
    .map(
      (url) => `
    <tr>
      <td class="url">${escapeHtml(url.target_url)}</td>
      <td class="number">${url.requests}</td>
      <td class="number">${url.avg_latency_ms ? url.avg_latency_ms.toFixed(0) : '-'}ms</td>
      <td class="number">${url.min_latency_ms ? url.min_latency_ms : '-'}ms</td>
      <td class="number">${url.max_latency_ms ? url.max_latency_ms : '-'}ms</td>
    </tr>
  `
    )
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function hideError() {
  const errorEl = document.getElementById('error');
  errorEl.style.display = 'none';
}

function showSuccess(message) {
  // 성공 메시지는 자동으로 사라지도록
  const el = document.createElement('div');
  el.className = 'success';
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.top = '20px';
  el.style.right = '20px';
  el.style.zIndex = '9999';
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 3000);
}

// 자동 새로고침 토글
document.addEventListener('DOMContentLoaded', () => {
  // 토큰 확인 후 초기 로드
  const token = getAdminToken();
  if (token) {
    refreshDashboard();
  } else {
    // 토큰 입력 요청
    const token = prompt('관리자 토큰을 입력해주세요:');
    if (token) {
      saveAdminToken(token);
      refreshDashboard();
    } else {
      showError('토큰이 필요합니다. URL에 ?token=YOUR_TOKEN을 추가하거나 다시 시도해주세요.');
    }
  }

  // 자동 새로고침 체크박스
  document.getElementById('autoRefresh').addEventListener('change', (e) => {
    if (e.target.checked) {
      autoRefreshInterval = setInterval(() => {
        refreshDashboard();
      }, 5000);
    } else {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    }
  });

  // 초기 시간 표시
  document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
});

// 글로벌 새로고침 함수
function refreshDashboard() {
  const token = getAdminToken();
  if (!token) {
    showError('토큰이 없습니다.');
    return;
  }

  try {
    hideError();
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();

    // 비동기 로드
    Promise.all([
      fetchAnalytics('summary'),
      fetchAnalytics('urls', { params: { limit: 10 } })
    ])
      .then(([summary, urls]) => {
        updateKpis(summary);
        updateCharts(summary);
        updatePerformance(summary);
        updateUrlsTable(urls);
        showSuccess('업데이트 완료!');
      })
      .catch((err) => {
        console.error('Refresh failed:', err);
        showError(err.message);
      });
  } catch (err) {
    showError(err.message);
  }
}
