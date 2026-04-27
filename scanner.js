// scanner.js — AR scan event handler
// In a real implementation, replace simulateScan() with a jsQR / ZXing QR decode

const API_BASE = 'http://localhost:3000';

async function simulateScan(toolId, mode, sessionContext) {
    const { sessionId, technicianId, workOrder, location } = sessionContext;
    const endpoint = mode === 'checkout' ? '/checkout' : '/checkin';

    const payload = { toolId, technicianId, sessionId, workOrder, location };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showAROverlay('success', data.message);
            logEvent(data.event);
        } else {
            handleScanError(data.error, data.message);
        }
    } catch (err) {
        showAROverlay('error', 'Network error — backend unreachable');
        console.error('Scan error:', err);
    }
}

function handleScanError(errorCode, message) {
    const errorMap = {
        'TOOL_NOT_FOUND': { type: 'error', display: 'Unknown Tool — not in system' },
        'ALREADY_CHECKED_OUT': { type: 'warning', display: 'Duplicate — already checked out' },
        'ALREADY_RETURNED': { type: 'warning', display: 'Already returned this session' },
        'MISSING_FIELDS': { type: 'error', display: 'Scan error — missing data' },
        'INVALID_STATE': { type: 'error', display: 'Unexpected tool state' },
    };

    const mapped = errorMap[errorCode] || { type: 'error', display: message };
    showAROverlay(mapped.type, mapped.display);
}

function showAROverlay(type, message) {
    // Update the DOM AR overlay element
    const overlay = document.getElementById('ar-result');
    overlay.className = `ar-result-overlay ${type} visible`;
    document.getElementById('ar-text').textContent = message;
    setTimeout(() => overlay.classList.remove('visible'), 3500);
}