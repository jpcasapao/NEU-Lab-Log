# NEU Laboratory Usage Log
### New Era University — Laboratory Management System

A web-based QR scan system for tracking professor laboratory usage across NEU computer rooms. Built with vanilla HTML/CSS/JS, Firebase Firestore, and Firebase Authentication.
Deployed Live link: https://neu-lab-log-c379c.web.app/
---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Flow](#system-flow)
4. [Project Structure](#project-structure)
5. [Firebase Setup](#firebase-setup)
6. [Firestore Rules](#firestore-rules)
7. [Firestore Collections](#firestore-collections)
8. [Deployment](#deployment)
9. [Usage Guide](#usage-guide)
10. [Mobile Support](#mobile-support)
11. [Tech Stack](#tech-stack)

---

## Overview

The NEU Laboratory Usage Log is a digital attendance and usage tracking system for the New Era University computer laboratories (Rooms M101–M106). Professors scan a QR code posted inside each lab room to log their check-in time. They check out when done, and the system records total usage duration. Administrators have a full dashboard to view statistics, manage QR codes, and export usage reports.

---

## Features

### Professor Portal
- Google Sign-In restricted to `@neu.edu.ph` accounts
- Professors must be pre-registered by an administrator
- Scan room QR code to check in (full-screen camera on mobile)
- Manual room selection as fallback (no QR scan needed)
- Active session banner with live elapsed timer
- One-tap Check Out with automatic duration calculation
- Session auto-restored on re-login if not checked out

### Admin Dashboard
- **Overview Tab** — Live stats: total logs, most used room, total professors, today's activity
- **Room QR Codes Tab** — Generate, download (PNG), and print QR codes for all 6 rooms
- **Usage Logs Tab** — Searchable, filterable, sortable table on desktop; card layout on mobile
- Filter by professor name, room, and date range (daily/weekly/monthly/custom)
- Export filtered data to CSV
- Real-time Firestore listener — updates automatically

---

## System Flow

```
ADMIN
  └── Logs in (Google, @neu.edu.ph, listed in `admins` collection)
  └── Generates room QR codes → Downloads/Prints → Posts in lab rooms
  └── Adds professors to `professors` collection to grant access

PROFESSOR
  └── Logs in (Google, @neu.edu.ph, listed in `professors` collection)
  └── Scans room QR code (or selects room manually)
  └── Confirms check-in → Active session banner with live timer appears
  └── Taps Check Out → Duration saved to Firestore

ADMIN DASHBOARD
  └── Sees all check-ins in real time
  └── Views stats, charts, and full usage logs
  └── Exports CSV reports
```

---

## Project Structure

```
NEU-Lab-mobile/
├── public/
│   ├── index.html              ← HTML structure & script/style links
│   ├── css/
│   │   ├── main.css            ← Base styles, variables, animations, header
│   │   ├── landing.css         ← Landing page styles
│   │   ├── professor.css       ← Professor portal styles (incl. mobile)
│   │   ├── admin.css           ← Admin dashboard styles (incl. mobile cards)
│   │   └── modals.css          ← Modals, overlays, QR scanner, toast
│   └── js/
│       ├── firebase-init.js    ← Firebase config & room constants
│       ├── utils.js            ← Shared state, helpers, formatters
│       ├── auth.js             ← Google Sign-In, routing, access control
│       ├── professor.js        ← Scanner, check-in, check-out, session
│       ├── admin.js            ← Admin dashboard entry & tab switching
│       ├── qr.js               ← QR generation, download, print
│       └── data.js             ← Firestore, stats, charts, filters, table, CSV
├── firebase.json               ← Firebase Hosting configuration
├── .firebaserc                 ← Firebase project ID binding
└── README.md                   ← This documentation
```

---

## Firebase Setup

### 1. Authentication
Firebase Console → Authentication → Sign-in method → Enable:
- ✅ Google
- ✅ Anonymous *(required for kiosk QR scanning)*

### 2. Authorized Domains
Firebase Console → Authentication → Settings → Authorized domains → Add:
```
neu-lab-log-c379c.web.app
neu-lab-log-c379c.firebaseapp.com
```

### 3. Firestore Database
Create a Firestore database in production mode, then apply the security rules below.

---

## Firestore Rules

Go to **Firebase Console → Firestore Database → Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /logs/{id} {
      allow create: if request.auth != null
        && request.auth.token.email.matches('.*@neu\\.edu\\.ph');
      allow update: if request.auth != null
        && request.auth.uid == resource.data.professorUID;
      allow read, list: if request.auth != null
        && (request.auth.uid == resource.data.professorUID
        || exists(/databases/$(database)/documents/admins/$(request.auth.token.email)));
    }

    match /admins/{email} {
      allow read: if request.auth != null
        && request.auth.token.email == email;
    }

    match /professors/{email} {
      allow read: if request.auth != null
        && request.auth.token.email == email;
      allow read, write: if request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

  }
}
```

---

## Firestore Collections

### `admins`
Stores administrator accounts. Only users in this collection can access the admin dashboard.

| Field | Type   | Description            |
|-------|--------|------------------------|
| email | string | Must match Document ID |

**How to add an admin:**
1. Firestore → Data → `admins` collection → Add document
2. Document ID: `youremail@neu.edu.ph`
3. Add field: `email` (string) = `youremail@neu.edu.ph`

---

### `professors`
Stores whitelisted professor accounts. Only users in this collection can log in.

| Field | Type   | Description            |
|-------|--------|------------------------|
| email | string | Must match Document ID |

**How to add a professor:**
1. Firestore → Data → `professors` collection → Add document
2. Document ID: `professor@neu.edu.ph`
3. Add field: `email` (string) = `professor@neu.edu.ph`

---

### `logs`
Stores every check-in and check-out record.

| Field             | Type      | Description                           |
|-------------------|-----------|---------------------------------------|
| professorName     | string    | Display name of professor             |
| professorEmail    | string    | Institutional email                   |
| professorPhotoURL | string    | Google profile photo URL              |
| professorUID      | string    | Firebase Auth UID                     |
| room              | string    | Room code e.g. `M101`                |
| status            | string    | `active` while in use, `done` after   |
| timestamp         | timestamp | Server timestamp of check-in          |
| checkInTimestamp  | timestamp | Server timestamp of check-in          |
| date              | string    | Formatted date e.g. `March 15, 2026`  |
| time              | string    | Check-in time e.g. `02:30 PM`         |
| checkOutTimestamp | timestamp | Server timestamp of check-out         |
| checkOutTime      | string    | Check-out time e.g. `04:00 PM`        |
| durationMinutes   | number    | Total minutes used                    |

---

## Deployment

### Prerequisites
- [Node.js](https://nodejs.org) installed
- Firebase CLI: `npm install -g firebase-tools`

### Steps

```powershell
# Navigate into the project folder
cd NEU-Lab-mobile

# Login to Firebase (opens browser)
firebase login

# Deploy
firebase deploy --only hosting
```

App will be live at: `https://neu-lab-log-c379c.web.app`

### Re-deploying after changes
```powershell
firebase deploy --only hosting
```

---

## Usage Guide

### For Administrators

1. Open the app and sign in with your `@neu.edu.ph` Google account
2. You will land on the **Overview** tab automatically
3. Go to **Room QR Codes** tab — QR codes generate when the tab opens
4. Download or print QR codes and post them inside each lab room
5. View all professor check-ins in **Usage Logs**
6. Filter by professor, room, or date range
7. Click **Export CSV** to download a report

### For Professors

1. Open the app and sign in with your `@neu.edu.ph` Google account
   - You must be pre-registered by an administrator in the `professors` collection
2. Tap **Scan Room QR Code** and point the camera at the QR posted in the room
   - Or tap your room directly from the room grid
3. Confirm your check-in in the dialog
4. A red active session banner appears with a live timer
5. When done, tap **Check Out** — duration is saved automatically

---

## QR Code Format

Room QR codes encode a simple plain-text payload:

```
NEU-LAB:M101
NEU-LAB:M102
... etc.
```

The scanner accepts this format plus legacy JSON and plain room codes for backward compatibility.

---

## Mobile Support

The app is fully responsive and optimized for mobile browsers (tested on Android Chrome).

### QR Scanner Modal (`modals.css`, `professor.js`)

The scanner opens as a **true full-screen overlay** on mobile (`≤640px`):

- The modal takes `100dvh` and uses `display:flex; flex-direction:column` so the camera fills all available space between the header and footer
- The `html5-qrcode` library injects inline `width`/`height` styles directly onto its internal `<div>` and `<video>` elements. These are stripped after the camera starts via `scrubQrInlineStyles()`, which runs immediately and again after 250 ms to catch any async re-application
- All library-generated UI chrome (dashboard, status spans, file input, buttons) is hidden via CSS `display:none`
- The `qrbox` size is reduced to `200×200` on mobile (vs `250×250` on desktop) and `aspectRatio` is left unset so the camera uses the phone's native portrait ratio rather than being forced square
- The footer (hint text + manual room buttons) is independently scrollable (`max-height:42vh; overflow-y:auto`) so it never obscures the viewfinder

### Usage Logs (`admin.css`)

On mobile the horizontal-scroll desktop table is hidden and replaced with a **card layout**:

- `@media(max-width:640px)` sets `.tbl-box { display:none }` and `.mob-cards { display:flex }`
- Each log entry becomes a card (`div.mob-card`) with professor name/avatar, room badge, and date/time/duration pills
- The filter bar inputs stack full-width (`flex-direction:column`) for comfortable thumb use
- Pagination controls remain visible below the cards

### Professor Portal (`professor.css`)

- Hero banner, active session strip, and room grid are all compact and touch-friendly at `≤600px`
- Room grid switches from 3-column → 2-column → 1-column as screen width decreases
- Active session banner stacks vertically with a full-width Check Out button

---

## Tech Stack

| Technology         | Purpose                                    |
|--------------------|--------------------------------------------|
| HTML / CSS / JS    | Single-page application                    |
| Firebase Auth      | Google Sign-In, access control             |
| Firebase Firestore | Real-time database                         |
| Firebase Hosting   | Web deployment                             |
| html5-qrcode       | QR code camera scanning                    |
| api.qrserver.com   | QR code image generation                   |
| Chart.js           | Usage charts on admin dashboard            |
| Outfit font        | Primary UI font                            |
| IBM Plex Mono      | Monospace font for times/codes             |

---


© 2026 New Era University · CICS Department · NEU Laboratory Management System v3.1
