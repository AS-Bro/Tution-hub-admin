# TuitionHub — Student Management Web Application

**TuitionHub** is a clean, feature-packed, multi-page web management platform designed specifically for private tutors, coaching centers, and tuition institutes. It offers complete offline-first capability backed by optional real-time sync with **Google Sheets** via Google Apps Script (`code.gs`).

---

## 📁 File Structure & Organization

All modular files are clean and separated into dedicated HTML, CSS, and JS files for easy editing and future customization:

```text
/
├── README.md                      # Complete system documentation & Apps Script guide
├── code.gs                        # Google Apps Script backend source code
└── app/src/main/assets/
    ├── styles.css                 # Master CSS stylesheet (Themes, Responsive Layouts, UI Components)
    ├── common.js                  # Core JS Engine (LocalStorage, Shell Navbar, Toasts, Modals, Theme)
    ├── google-sheets-sync.js      # Google Sheets live synchronization manager
    │
    ├── index.html                 # Main Dashboard page
    ├── dashboard.js               # Dashboard metrics & overview widgets logic
    │
    ├── student.html               # Student Directory & Management page
    ├── student.js                 # Student CRUD, ID Card generator & PDF export
    │
    ├── attendance.html            # Attendance Register page
    ├── attendance.js              # Daily attendance marking, history & WhatsApp alerts
    │
    ├── fee.html                   # Fee Management & Dues Tracker page
    ├── fee.js                     # Fee collection, payment receipts & automated reminders
    │
    ├── exams-and-marks.html       # Exams & Evaluation page
    ├── exams.js                   # Test creation, mark entry, rank calculation & report cards
    │
    ├── timetable.html             # Schedule & Timetable page
    ├── timetable.js               # Class slot matrix, teacher allocation & live class launcher
    │
    ├── notice.html                # Notice Board page
    ├── notice.js                  # Announcements publishing & WhatsApp broadcast
    │
    ├── settings.html              # Center Configurations page
    └── settings.js                # Institute details, Google Sheets URL, backups & restore
```

---

## 🌟 Key Features & Page Breakdown

### 1. Dashboard (`index.html` / `dashboard.js`)
* **Overview Analytics**: View Total Students Enrolled, Today's Attendance Rate, Total Outstanding Dues, and Active Scheduled Tests.
* **1-Click Quick Operations**: Instant shortcuts to mark attendance, collect fees, register a student, publish notices, or launch online classes.
* **Live Schedule Widget**: Preview today's class timings and assigned rooms.
* **Announcement Feed**: Display top active notices and upcoming test alerts.

### 2. Student Directory (`student.html` / `student.js`)
* **Comprehensive Profiles**: Register students with Name, Student ID, Batch/Grade, Monthly Fee, Parent Contact, and Joining Date.
* **Search & Filter**: Search instantly by name, ID, or phone number; filter by batch and active status.
* **ID Card Generator**: Generate and print official Student Identification Cards.
* **PDF Report Exporter**: Download individual student profile cards or export the full student directory as a PDF document.
* **Direct Parent Communication**: Instant WhatsApp action button for each student.

### 3. Attendance Tracker (`attendance.html` / `attendance.js`)
* **Interactive Register**: Select any date and batch to view student lists.
* **1-Click Bulk Actions**: Mark all students as *Present* or *Absent* in a single tap.
* **Status Toggles**: Easily toggle individual statuses between *Present*, *Absent*, and *Late*.
* **Automated WhatsApp Absentees Notice**: Trigger instant notification messages to parents of absent students.
* **Attendance History Analytics**: Automatic calculation of overall attendance percentage per student.

### 4. Fee Management (`fee.html` / `fee.js`)
* **Dues Tracker**: Track monthly fee status (Paid / Pending) for all active students.
* **Payment Recorder**: Record payments with amount, payment mode (Cash, UPI, Cheque, Bank Transfer), and date.
* **Instant Fee Receipts**: Generate and download official PDF fee receipts for parents.
* **Automated Fee Reminders**: Send formatted WhatsApp payment reminders for overdue fees.
* **Financial Metrics**: Real-time revenue analytics showing total collected vs. outstanding pending revenue.

### 5. Exams & Marks (`exams-and-marks.html` / `exams.js`)
* **Test Creation**: Create custom evaluation tests specifying Test Title, Target Batch, Max Marks, and Test Date.
* **Marks Entry Table**: Simple score entry table with automatic validation.
* **Performance Analytics**: Instant calculation of Class Average, Highest Score, and Evaluated Student count.
* **Parent Test Updates**: Send test score reports directly to parents via WhatsApp.

### 6. Schedule & Timetable (`timetable.html` / `timetable.js`)
* **Class Matrix**: Manage weekly time slots for subjects, recurring days, assigned tutors, and classrooms.
* **Online Class Launcher**: Quick-launch button for online sessions (Google Meet / Zoom).
* **WhatsApp Schedule Broadcast**: Broadcast the full weekly schedule to student/parent groups in 1 click.

### 7. Notice Board (`notice.html` / `notice.js`)
* **Publish Announcements**: Post notices tagged by Category (*Exam*, *Holiday*, *General*, *Fees Alert*) and Target Batch.
* **Broadcast**: Copy and share notice text formatted with WhatsApp bold/italic syntax.

### 8. System Settings (`settings.html` / `settings.js`)
* **Branding Details**: Customize Institute Name, Tutor Name, Phone Number, WhatsApp Number, and Online Class Link.
* **Fee Defaults**: Set Currency symbol (e.g., ₹, $, €), Student ID prefix, and default monthly fee.
* **Google Sheets Integration**: Configure and test Google Apps Script Web App URL.
* **JSON System Backup & Restore**: Export full JSON database backups or restore previously exported files.

---

## 📊 Google Sheets Apps Script Setup Guide (`code.gs`)

Follow these simple steps to link TuitionHub to your own Google Sheet:

1. **Create a Google Sheet**: Open [sheets.new](https://sheets.new) in your web browser.
2. **Open Apps Script**: Go to the top menu and select **Extensions > Apps Script**.
3. **Paste Script**: Delete any existing code in the Apps Script editor and copy the entire contents of the `code.gs` file provided in this project.
4. **Deploy as Web App**:
   * Click **Deploy > New deployment**.
   * Click the gear icon next to "Select type" and choose **Web app**.
   * **Description**: `TuitionHub Backend`
   * **Execute as**: `Me`
   * **Who has access**: `Anyone`
5. **Authorize**: Click **Deploy**, authorize permissions when prompted by Google.
6. **Copy Web App URL**: Copy the generated **Web App URL** ending in `/exec`.
7. **Connect in TuitionHub**:
   * Go to **Settings** in TuitionHub.
   * Paste the URL into the **Google Apps Script Web App URL** input field.
   * Click **Save & Test Sync**.

---

## 💡 How to Edit or Extend Code in the Future

* **Styling**: All CSS rules, color palettes, dark mode variables, and animations are located in `styles.css`.
* **State & Logic**: Shared helper functions, modal windows, and toast messages are in `common.js`.
* **Page Layouts**: Each `.html` file is concise and imports `common.js` and its dedicated `.js` script module.
* **Backend Actions**: To add a new Google Sheet table or action, simply add a new `case` block in `code.gs` and invoke `window.apiRequest('actionName', payload)` in the frontend.
