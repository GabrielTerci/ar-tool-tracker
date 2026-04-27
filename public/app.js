let state = {
    tools: [],
    sessionId: null,
    mode: 'checkout',
    logs: [],
    scanning: false,
};

function init() {
    state.sessionId = 'SES-' + Math.floor(Math.random() * 90000 + 10000);
    document.getElementById('session-id').textContent = state.sessionId;
    loadToolsFromBackend();
    renderLog();
}

async function loadToolsFromBackend() {
    try {
        const res = await fetch('/tools/status');
        const data = await res.json();

        state.tools = data.tools.map(tool => ({
            ...tool,
            emoji: getToolEmoji(tool.id),
            checkedOutAt: null,
            checkedInAt: null
        }));

        renderSidebar();
        renderToolSelect();
        renderCheckin();
        updateStatsFromBackend(data);
    } catch (err) {
        console.error(err);
        showToast('Failed to load tool status', 't-error');
    }
}

function getToolEmoji(toolId) {
    const emojiMap = {
        'TL-001': '🔧',
        'TL-002': '⚡',
        'TL-003': '🔵',
        'TL-004': '✂️',
        'TL-005': '📏'
    };
    return emojiMap[toolId] || '🛠️';
}

function renderSidebar() {
    const el = document.getElementById('tool-list');
    const currentSelected = document.getElementById('tool-select')?.value;

    el.innerHTML = state.tools.map(t => `
    <div class="tool-item ${currentSelected === t.id ? 'selected' : ''}" onclick="selectTool('${t.id}')">
      <div class="tool-icon ${mapToolClass(t.status)}">${t.emoji}</div>
      <div>
        <div class="tool-name">${t.name}</div>
        <div class="tool-id">${t.id}</div>
      </div>
      <div class="status-dot ${mapToolClass(t.status)}"></div>
    </div>
  `).join('');
}

function renderToolSelect() {
    const sel = document.getElementById('tool-select');
    const selectedValue = sel.value;

    sel.innerHTML = state.tools.map(t =>
        `<option value="${t.id}">${t.name} (${t.id})</option>`
    ).join('');

    if (state.tools.some(t => t.id === selectedValue)) {
        sel.value = selectedValue;
    }

    renderSidebar();
}

function mapToolClass(status) {
    if (status === 'checked-out') return 'checked-out';
    if (status === 'checked-in') return 'checked-in';
    if (status === 'missing') return 'missing';
    return 'checked-in';
}

function updateStatsFromBackend(data) {
    document.getElementById('stat-out').textContent = data.checkedOut;
    document.getElementById('stat-in').textContent =
        data.tools.filter(t => t.status === 'checked-in').length;
    document.getElementById('stat-missing').textContent = data.missing;
}

let scanTimeout = null;

function doScan() {
    if (state.scanning) return;

    const toolId = document.getElementById('tool-select').value;
    const tool = state.tools.find(t => t.id === toolId);
    if (!tool) return;

    state.scanning = true;
    document.getElementById('scan-line').classList.remove('paused');
    document.getElementById('ar-prompt').textContent = 'SCANNING...';
    document.getElementById('ar-sub').textContent = tool.name + ' · ' + tool.id;

    clearOverlay();

    setTimeout(async () => {
        state.scanning = false;
        document.getElementById('scan-line').classList.add('paused');

        if (state.mode === 'checkout') {
            await handleCheckout(tool);
        } else {
            await handleCheckin(tool);
        }

        await loadToolsFromBackend();
        renderCheckin();
    }, 1800);
}

async function handleCheckout(tool) {
    const techId = document.getElementById('tech-id').value || 'TECH-001';
    const wo = document.getElementById('work-order').value || 'WO-UNKNOWN';
    const loc = document.getElementById('location-select').value;

    try {
        const res = await fetch('/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toolId: tool.id,
                technicianId: techId,
                sessionId: state.sessionId,
                workOrder: wo,
                location: loc
            })
        });

        const data = await res.json();

        if (res.ok) {
            showOverlay('success', '✓', 'CHECKED OUT', data.message);
            addLog('checkout', `Check-out: ${tool.name} (${tool.id}) to ${techId}`, techId, wo);
            showToast(data.message, 't-success');
        } else {
            showOverlay('error', '⚠️', 'ERROR', data.message);
            addLog('warn', `Checkout failed: ${tool.name} (${tool.id}) — ${data.message}`, techId, wo);
            showToast(data.message, 't-error');
        }
    } catch (err) {
        console.error(err);
        showOverlay('error', '⚠️', 'NETWORK ERROR', 'Could not reach backend');
        showToast('Network error during checkout', 't-error');
    }
}

async function handleCheckin(tool) {
    const techId = document.getElementById('tech-id').value || 'TECH-001';

    try {
        const res = await fetch('/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toolId: tool.id,
                technicianId: techId,
                sessionId: state.sessionId
            })
        });

        const data = await res.json();

        if (res.ok) {
            showOverlay('success', '✓', 'CHECKED IN', data.message);
            addLog('checkin', `Check-in: ${tool.name} (${tool.id}) by ${techId}`, techId, '—');
            showToast(data.message, 't-success');
        } else {
            showOverlay('warning', 'ℹ️', 'CHECK-IN FAILED', data.message);
            addLog('warn', `Check-in failed: ${tool.name} (${tool.id}) — ${data.message}`, techId, '—');
            showToast(data.message, 't-warn');
        }
    } catch (err) {
        console.error(err);
        showOverlay('error', '⚠️', 'NETWORK ERROR', 'Could not reach backend');
        showToast('Network error during check-in', 't-error');
    }
}

function showOverlay(type, icon, text, sub) {
    const el = document.getElementById('ar-result');
    el.className = 'ar-result-overlay ' + type + ' visible';
    document.getElementById('ar-icon').textContent = icon;
    document.getElementById('ar-text').textContent = text;
    document.getElementById('ar-sub2').textContent = sub;

    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
        el.classList.remove('visible');
    }, 3500);
}

function clearOverlay() {
    document.getElementById('ar-result').className = 'ar-result-overlay';
}

function toggleMode() {
    state.mode = state.mode === 'checkout' ? 'checkin' : 'checkout';
    document.getElementById('mode-badge').textContent =
        'MODE: ' + (state.mode === 'checkout' ? 'CHECK-OUT' : 'CHECK-IN');

    const btn = document.querySelector('.controls .btn:nth-child(2)');
    btn.textContent = state.mode === 'checkout'
        ? 'Switch to Check-in'
        : 'Switch to Check-out';

    showToast('Mode: ' + (state.mode === 'checkout' ? 'Check-out' : 'Check-in'), '');
}

function selectTool(id) {
    document.getElementById('tool-select').value = id;
    renderSidebar();
}

function addLog(type, msg, tech, wo) {
    state.logs.unshift({
        type,
        msg,
        tech,
        wo,
        time: new Date().toLocaleTimeString()
    });
    renderLog();
}

function renderLog() {
    const el = document.getElementById('event-log');
    if (!state.logs.length) {
        el.innerHTML = '<div style="color:#6b7280;font-size:13px;padding:8px 0">No events yet — start scanning tools.</div>';
        return;
    }

    el.innerHTML = state.logs.map(l => `
    <div class="log-entry ${l.type}">
      <div class="log-time">${l.time} · Tech: ${l.tech} · WO: ${l.wo}</div>
      <div class="log-action">${l.msg}</div>
    </div>
  `).join('');
}

function clearLog() {
    state.logs = [];
    renderLog();
}

function renderCheckin() {
    const el = document.getElementById('checkin-list');
    const out = state.tools.filter(t =>
        t.status === 'checked-out' ||
        t.status === 'checked-in' ||
        t.status === 'missing'
    );

    if (!out.length) {
        el.innerHTML = '<div style="color:#6b7280;font-size:13px;padding:8px 0">No tools checked out in this session.</div>';
        return;
    }

    el.innerHTML = out.map(t => {
        let pillClass = t.status === 'checked-out'
            ? 'pill-out'
            : t.status === 'checked-in'
                ? 'pill-in'
                : 'pill-missing';

        let pillText = t.status === 'checked-out'
            ? 'Outstanding'
            : t.status === 'checked-in'
                ? 'Returned'
                : 'Missing';

        return `
      <div class="checkin-tool-row">
        <div style="font-size:20px">${t.emoji}</div>
        <div>
          <div style="font-size:13px;font-weight:500">${t.name}</div>
          <div style="font-size:11px;color:#6b7280;font-family:Consolas, monospace">${t.id}</div>
        </div>
        <div class="checkin-status-pill ${pillClass}">${pillText}</div>
      </div>
    `;
    }).join('');
}

function refreshCheckin() {
    loadToolsFromBackend();
}

async function completeCheckin() {
    const resEl = document.getElementById('checkin-result');

    try {
        const res = await fetch('/checkin/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.sessionId })
        });

        const data = await res.json();

        if (res.ok) {
            resEl.innerHTML = `<span style="color:green;font-weight:500">✓ ${data.message}</span>`;
            addLog('checkin', `Session ${state.sessionId} closed — all tools verified`, 'SYSTEM', '—');
            showToast(data.message, 't-success');
        } else {
            resEl.innerHTML = `<span style="color:red;font-weight:500">⚠ ${data.message}</span>`;
            addLog('error', `Validation failed — ${data.message}`, 'SYSTEM', '—');
            showToast(data.message, 't-error');
        }
    } catch (err) {
        console.error(err);
        resEl.innerHTML = `<span style="color:red;font-weight:500">⚠ Validation request failed</span>`;
        showToast('Network error during validation', 't-error');
    }
}

async function simulateError(type) {
    if (type === 'duplicate') {
        const toolId = document.getElementById('tool-select').value;
        const tool = state.tools.find(t => t.id === toolId);
        if (!tool) return;
        await handleCheckout(tool);
        await loadToolsFromBackend();
        return;
    }

    if (type === 'missing') {
        showToast('Use checkout without checkin, then click Validate & Complete Check-in to simulate a missing tool.', 't-warn');
    }
}

let toastTimer;
function showToast(msg, cls) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (cls || '');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t, i) => {
        const names = ['scan', 'checkin', 'log'];
        t.classList.toggle('active', names[i] === name);
    });

    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');

    if (name === 'checkin') renderCheckin();
}

init();