const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Simple JSON-based data store ---
const DB_PATH = path.join(__dirname, 'tooldb.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) {
        const seed = {
            tools: [
                { id: 'TL-001', name: 'Torque Wrench', status: 'available', logs: [] },
                { id: 'TL-002', name: 'Digital Multimeter', status: 'available', logs: [] },
                { id: 'TL-003', name: 'Pressure Gauge', status: 'available', logs: [] },
                { id: 'TL-004', name: 'Wire Stripper', status: 'available', logs: [] },
                { id: 'TL-005', name: 'Spirit Level', status: 'available', logs: [] }
            ],
            events: []
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
    }

    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// --- POST /checkout ---
app.post('/checkout', (req, res) => {
    const { toolId, technicianId, sessionId, workOrder, location } = req.body;

    if (!toolId || !technicianId || !sessionId) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_FIELDS',
            message: 'toolId, technicianId, and sessionId are required.'
        });
    }

    const db = readDB();
    const tool = db.tools.find(t => t.id === toolId);

    if (!tool) {
        return res.status(404).json({
            success: false,
            error: 'TOOL_NOT_FOUND',
            message: `No tool found with ID: ${toolId}`
        });
    }

    if (tool.status === 'checked-out') {
        return res.status(409).json({
            success: false,
            error: 'ALREADY_CHECKED_OUT',
            message: `${tool.name} is already checked out.`
        });
    }

    tool.status = 'checked-out';

    const event = {
        eventId: uuidv4(),
        type: 'CHECKOUT',
        toolId,
        toolName: tool.name,
        technicianId,
        sessionId,
        workOrder: workOrder || 'UNSPECIFIED',
        location: location || 'UNSPECIFIED',
        timestamp: new Date().toISOString()
    };

    tool.logs.push(event);
    db.events.push(event);
    writeDB(db);

    return res.status(200).json({
        success: true,
        message: `${tool.name} checked out to ${technicianId}.`,
        event
    });
});

// --- POST /checkin ---
app.post('/checkin', (req, res) => {
    const { toolId, technicianId, sessionId } = req.body;

    if (!toolId || !technicianId || !sessionId) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_FIELDS',
            message: 'toolId, technicianId, and sessionId are required.'
        });
    }

    const db = readDB();
    const tool = db.tools.find(t => t.id === toolId);

    if (!tool) {
        return res.status(404).json({
            success: false,
            error: 'TOOL_NOT_FOUND',
            message: `No tool found with ID: ${toolId}`
        });
    }

    if (tool.status === 'checked-in' || tool.status === 'available') {
        return res.status(409).json({
            success: false,
            error: 'ALREADY_RETURNED',
            message: `${tool.name} has already been returned.`
        });
    }

    if (tool.status !== 'checked-out') {
        return res.status(400).json({
            success: false,
            error: 'INVALID_STATE',
            message: `${tool.name} has an unexpected status: ${tool.status}`
        });
    }

    tool.status = 'checked-in';

    const event = {
        eventId: uuidv4(),
        type: 'CHECKIN',
        toolId,
        toolName: tool.name,
        technicianId,
        sessionId,
        timestamp: new Date().toISOString()
    };

    tool.logs.push(event);
    db.events.push(event);
    writeDB(db);

    return res.status(200).json({
        success: true,
        message: `${tool.name} successfully returned.`,
        event
    });
});

// --- GET /tools/status ---
app.get('/tools/status', (req, res) => {
    const db = readDB();

    const summary = {
        totalTools: db.tools.length,
        checkedOut: db.tools.filter(t => t.status === 'checked-out').length,
        available: db.tools.filter(t => t.status === 'available').length,
        missing: db.tools.filter(t => t.status === 'missing').length,
        tools: db.tools.map(({ id, name, status }) => ({ id, name, status }))
    };

    return res.status(200).json(summary);
});

// --- POST /checkin/validate ---
app.post('/checkin/validate', (req, res) => {
    const { sessionId } = req.body;
    const db = readDB();

    const sessionEvents = db.events.filter(e => e.sessionId === sessionId);

    const checkedOutIds = sessionEvents
        .filter(e => e.type === 'CHECKOUT')
        .map(e => e.toolId);

    const checkedInIds = sessionEvents
        .filter(e => e.type === 'CHECKIN')
        .map(e => e.toolId);

    const unresolved = checkedOutIds.filter(id => !checkedInIds.includes(id));

    if (unresolved.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_TOOLS',
            unresolved,
            message: `${unresolved.length} tool(s) not returned: ${unresolved.join(', ')}`
        });
    }

    return res.status(200).json({
        success: true,
        message: 'All tools accounted for. Session validated.',
        totalCheckedOut: checkedOutIds.length,
        totalReturned: checkedInIds.length
    });
});

// --- POST /reset ---
app.post('/reset', (req, res) => {
    const freshData = {
        tools: [
            { id: 'TL-001', name: 'Torque Wrench', status: 'available', logs: [] },
            { id: 'TL-002', name: 'Digital Multimeter', status: 'available', logs: [] },
            { id: 'TL-003', name: 'Pressure Gauge', status: 'available', logs: [] },
            { id: 'TL-004', name: 'Wire Stripper', status: 'available', logs: [] },
            { id: 'TL-005', name: 'Spirit Level', status: 'available', logs: [] }
        ],
        events: []
    };

    writeDB(freshData);
    res.json({ success: true, message: 'System reset successfully' });
});

// --- Start server ---
app.listen(3000, () => {
    console.log('Tool Tracker API running on http://localhost:3000');
});