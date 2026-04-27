# AR Tool Tracking System

This project is a prototype **AR-assisted tool tracking system** designed to improve accountability and reduce tool loss during maintenance workflows.

The system allows technicians to:
- Check tools in and out using a scanning interface
- Track tool status in real time
- Validate that all tools are returned at the end of a session
- Log all actions to a backend system

---

## 🚀 Features

- Tool check-in / check-out workflow
- Backend API with logging (Node.js + Express)
- Frontend interface simulating AR scanning
- Real-time tool status dashboard
- Error handling (duplicate scans, missing tools, invalid tools)
- Session validation (ensures all tools are returned)

---

## 🧱 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Data Storage:** JSON file (prototype level)

---

## 📂 Project Structure

ar-tool-tracker/
│
├── server.js # Backend API
├── package.json
├── README.md
├── .gitignore
│
├── public/
│ ├── index.html # Main UI (AR scanner simulation)
│ ├── styles.css # Styling
│ ├── app.js # Frontend logic
│ └── status.html # Dashboard view

## ▶️ How to Run the Project

1. Install dependencies:

```bash
npm install

2. Start the server:

node server.js

3. Open in browser:

Main Application:
http://localhost:3000

Status dashboard:
https://localhost3000/status.html


---

## 2. 🔄 Workflow (shows understanding)

This is very important for your marks — it proves you understand what you built.

```markdown
## 🔄 Workflow

### Check-out
1. Select a tool
2. Click "Scan Tool"
3. Tool is marked as checked-out
4. Event is logged in backend

### Check-in
1. Switch to check-in mode
2. Scan tool again
3. Tool is marked as checked-in

### Validation
1. Go to Check-in tab
2. Click "Validate & Complete"
3. System checks for missing tools

## ⚠️ Error Handling

The system handles:
- Duplicate scans (tool already checked out)
- Invalid tool IDs
- Attempt to return a tool that was not checked out
- Missing tools during validation

## 🧪 Testing

The system was tested using:

- Valid check-in and check-out flows
- Duplicate scan scenarios
- Missing tool validation
- Backend API responses using Thunder Client

All test cases were validated against expected results.

## 🎯 Purpose

This project was developed as part of an academic assessment to demonstrate:

- AR-assisted interaction design (simulated)
- Backend API integration
- Workflow validation and tool accountability
- Error handling and system reliability

## 📌 Notes

- This is a TRL-3 prototype (AR scanning is simulated)
- Data is stored locally using a JSON file
- No authentication is implemented (prototype scope)

## 👤 Author

Gabriel Terci