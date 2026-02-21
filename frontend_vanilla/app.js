const API_BASE = 'http://localhost:5000';

// Elements
const backendStatusEl = document.getElementById('backendStatus');
const videoUploadEl = document.getElementById('videoUpload');
const fileNameEl = document.getElementById('fileName');
const analyzeBtnEl = document.getElementById('analyzeBtn');

const initialState = document.getElementById('initialState');
const loadingState = document.getElementById('loadingState');
const resultsState = document.getElementById('resultsState');

const player = document.getElementById('player');
const hudOverlay = document.getElementById('hudOverlay');

// Global state
let currentFile = null;
let reportData = null;
let chartInstance = null;
let activeInterval = null;

// Health check
async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) backendStatusEl.className = 'status-dot connected';
    } catch (e) {
        backendStatusEl.className = 'status-dot';
    }
}
setInterval(checkHealth, 5000);
checkHealth();

// File handling
videoUploadEl.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentFile = file;
        fileNameEl.innerText = file.name;
        analyzeBtnEl.disabled = false;
    }
});

analyzeBtnEl.addEventListener('click', async () => {
    if (!currentFile) return;

    // Switch view
    initialState.classList.remove('active');
    loadingState.classList.add('active');
    analyzeBtnEl.disabled = true;

    const formData = new FormData();
    formData.append('video', currentFile);

    try {
        const res = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || errData.error || 'Server error');
        }

        reportData = await res.json();
        renderResults();

    } catch (error) {
        console.error(error);
        alert('Forensics bridge failed: ' + error.message);

        // Return to initial
        loadingState.classList.remove('active');
        initialState.classList.add('active');
        analyzeBtnEl.disabled = false;
    }
});

function renderResults() {
    loadingState.classList.remove('active');
    resultsState.classList.add('active');
    resultsState.classList.remove('hidden');

    // 1. Setup Video
    player.src = reportData.videoUrl;

    // 2. Setup Stats
    const summary = reportData.summary;
    document.getElementById('healthScore').innerText = `${summary.health_score}%`;
    const anomalyEl = document.getElementById('anomalyCount');
    anomalyEl.innerText = summary.error_count;

    const anomalyIconBg = document.getElementById('anomalyIconBg');
    if (summary.error_count > 0) {
        anomalyEl.className = 'stat-value text-amber';
        anomalyIconBg.className = 'stat-icon icon-amber';
    } else {
        anomalyEl.className = 'stat-value text-emerald';
        anomalyIconBg.className = 'stat-icon icon-emerald';
    }

    // 3. Setup Logs Area Text
    document.getElementById('framesAnalyzed').innerText = summary.processed_frames;
    document.getElementById('processingTime').innerText = summary.processing_time;
    document.getElementById('sourceFps').innerText = summary.fps ? summary.fps.toFixed(2) : '30.00';

    // 4. Render Logs
    renderLogs(reportData.errors);

    // 5. Render Chart
    renderChart(reportData.analytics);

    // 6. Setup HUD Sync
    setupVideoSync();
}

function renderLogs(errors) {
    const logList = document.getElementById('logList');
    logList.innerHTML = '';

    if (!errors || errors.length === 0) {
        logList.innerHTML = `
            <div class="all-clear">
                <i class="fa-solid fa-circle-check"></i>
                <p>TEMPORAL INTEGRITY SECURE</p>
            </div>
        `;
        return;
    }

    errors.forEach(err => {
        const isHigh = err.severity === 'High';
        const iconClass = isHigh ? 'fa-bolt' : 'fa-clock';
        const classSev = isHigh ? 'severity-high' : 'severity-medium';

        const el = document.createElement('div');
        el.className = `log-item ${classSev}`;
        el.innerHTML = `
            <div class="log-indicator"></div>
            <div class="log-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="log-content">
                <div class="log-meta">
                    <span class="log-time">T+${err.timestamp.toFixed(3)}s</span>
                    <span class="log-frame">FRAME ${err.frame}</span>
                </div>
                <div class="log-title">${err.type}</div>
                <div class="log-desc">${err.description}</div>
            </div>
            <div style="display:flex;align-items:center;color:var(--text-muted)">
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        `;

        el.onclick = () => {
            player.currentTime = err.timestamp;
            player.play();
        };

        logList.appendChild(el);
    });
}

function renderChart(analytics) {
    if (!analytics || analytics.length === 0) return;

    const ctx = document.getElementById('analyticsChart').getContext('2d');

    // Destroy previous instance if exists
    if (chartInstance) chartInstance.destroy();

    const labels = analytics.map(a => a.timestamp.toFixed(2));
    const motionData = analytics.map(a => a.motion_score);
    const blurData = analytics.map(a => a.blur_score);

    // Gradients
    const motionGrad = ctx.createLinearGradient(0, 0, 0, 400);
    motionGrad.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
    motionGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');

    const blurGrad = ctx.createLinearGradient(0, 0, 0, 400);
    blurGrad.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
    blurGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Motion Score',
                    data: motionData,
                    borderColor: '#22d3ee',
                    backgroundColor: motionGrad,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Blur Score',
                    data: blurData,
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    backgroundColor: blurGrad,
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#22d3ee',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

function setupVideoSync() {
    if (activeInterval) clearInterval(activeInterval);

    // Optimize performance by checking less frequently instead of every 'timeupdate' event
    activeInterval = setInterval(() => {
        if (!reportData || !reportData.errors) return;
        if (player.paused) return; // Optional

        const time = player.currentTime;
        // Find errors close to current time (within 0.8s window)
        const activeErrors = reportData.errors.filter(err => Math.abs(err.timestamp - time) < 0.8);

        renderHUD(activeErrors);
    }, 200);
}

// Keep track of displayed HUD errors to avoid DOM thrashing
let currentlyRenderedHud = '';

function renderHUD(errors) {
    if (errors.length === 0) {
        if (currentlyRenderedHud !== '') {
            hudOverlay.innerHTML = '';
            currentlyRenderedHud = '';
        }
        return;
    }

    const htmlString = errors.map(err => `
        <div class="hud-alert">
            <i class="fa-solid fa-bolt"></i>
            <div>
                <div class="title">Anomaly Detected</div>
                <div class="desc">${err.type} at ${err.timestamp.toFixed(2)}s</div>
            </div>
        </div>
    `).join('');

    if (currentlyRenderedHud !== htmlString) {
        hudOverlay.innerHTML = htmlString;
        currentlyRenderedHud = htmlString;
    }
}
