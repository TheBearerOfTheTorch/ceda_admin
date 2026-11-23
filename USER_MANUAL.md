# CEDA Innovation Canvas OS — User Manual

Welcome to **CEDA Workspace (CEDA Innovation Canvas OS)**, the collaborative citizen innovation intake, statutory screening, evaluation, board adjudication, and citizen support platform.

This guide covers account access, shared workspace tools, the multi-stage innovation lifecycle, and step-by-step instructions for every role in the system.

---

## Table of Contents
1. [System Roles Overview](#1-system-roles-overview)
2. [Getting Started & Account Access](#2-getting-started--account-access)
3. [Top Navigation Bar & Shared Controls](#3-top-navigation-bar--shared-controls)
4. [The 9-Stage Innovation Lifecycle](#4-the-9-stage-innovation-lifecycle)
5. [Citizen Submitter Guide](#5-citizen-submitter-guide)
6. [Administrator Guide](#6-administrator-guide)
7. [Evaluator Guide](#7-evaluator-guide)
8. [Adjudicator Guide](#8-adjudicator-guide)
9. [Citizen Support Agent Guide](#9-citizen-support-agent-guide)
10. [Real-Time Workspace Collaboration](#10-real-time-workspace-collaboration)
11. [Workspace AI Copilot](#11-workspace-ai-copilot)
12. [Keyboard Shortcuts & Canvas Navigation](#12-keyboard-shortcuts--canvas-navigation)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. System Roles Overview

CEDA Workspace enforces strict Role-Based Access Control (RBAC) across five user roles:

| Role | Primary Workspace | Core Responsibilities |
| :--- | :--- | :--- |
| **Submitter** | Citizen Submitter Portal | Submit innovation proposals, respond to evaluator clarifications, track real-time stage progress, browse FAQs, submit system feedback, and contact support agents. |
| **Administrator** | Admin Infinite Canvas & Console | Manage personnel, screen Stage 2 CIPA/BURS compliance, assign/reassign ideas and enquiries to officials, customize workflows/forms/FAQs, review feedback, monitor SLA alerts, and run AI queue actions. |
| **Evaluator** | Evaluator Canvas & Sidebar | Review assigned proposals, chat with Submitters for clarifications, score technical/commercial rubrics, monitor SLA deadlines, and advance cleared proposals toward Adjudication. |
| **Adjudicator** | Adjudicator Canvas & Board View | Review proposals entering Stage 5 (`Adjudication Board Chamber`), record collaborative panel scores and votes, issue Board decisions, and oversee post-board stages. |
| **Agent** | Agent Support Console | Manage availability (`Available`, `Busy`, `Offline`), handle assigned citizen enquiry threads in real time, and resolve support tickets. |

---

## 2. Getting Started & Account Access

Open the application login screen (**CEDA Innovation Canvas OS**). Four tabs are available:

1. **Sign In**:
   - Enter your **Email Address** and **Password**, then click **Sign In**.
   - Alternatively, click **Continue with Google** to sign in with a linked Google account.
2. **Create**:
   - Enter **First Name**, **Last Name**, **Email Address**, **Password** (minimum 6 characters), **Role** (`Administrator`, `Evaluator`, `Adjudicator`, `Agent`, or `Submitter`), and **Department**.
   - Click **Create Account (Empty Workspace)**. New Submitter accounts start completely blank so only your own submissions appear.
3. **Invite**:
   - When an Administrator invites you via email, opening the `?invite=<token>` link automatically selects the **Invite** tab. Set your password to activate your account and join any linked workspace.
4. **Reset**:
   - Enter your email address to receive a password reset link.

---

## 3. Top Navigation Bar & Shared Controls

Across the top of the workspace:

- **9-Dot App Launcher (`CEDA Modules`)**: Switch between core views (`Pipeline Orchestrator`, `Screening Matrix`, `Evaluation Deck`, `Board Approvals`) and administrative modules.
- **Analytics / Diligence Dropdown**: Quick summary pill (`Analytics Dashboard` for Administrators; `Workspace Diligence` for Reviewers) with a link to open full reports.
- **Zoom Pills (`50%`, `100%`, `200%`)**: Quickly snap the canvas zoom level.
- **Live Collaborators (Stacked Profile Circles)**: Displays profile circles of active collaborators currently inside a shared workspace (see [Section 10](#10-real-time-workspace-collaboration)).
- **Role Quick Action**:
  - Submitters see **Back to Submissions Panel** when viewing the canvas.
  - Administrators see **Admin Console** to manage users, categories, FAQs, and system feedback.
- **Notifications Bell**: Displays a pulsing unread badge for SLA alerts, stage transitions, and new assignments. Click to open the **Live Activity & Real-Time Presence** drawer.
- **Reports**: Opens the **Analytics View** (`Reports`), showing total ideas received, ideas per workflow stage, and finalized/rejected counts for Administrators, or personal assigned queue telemetry for Evaluators and Adjudicators.
- **Role Indicator**: Shows your current signed-in name, role badge, and sign-out option.

---

## 4. The 9-Stage Innovation Lifecycle

By default, the **CEDA National Commercialization Standard** runs through 9 sequential stages (customizable by Administrators in **Workflow Architect**):

| Stage | Name | Default Owner | Gate Threshold / Criteria | Default SLA |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Submission & Intake Ingest | Administrator | Citizen KYC Verified | 2 days |
| **2** | Statutory & Tax Screening | Administrator | BURS Clearance & CIPA Search | 3 days |
| **3** | Technical & Financial Evaluation | Evaluator | Weighted Rubric >= 75/100 | 7 days |
| **4** | Expert Committee Review | Evaluator | Technical Safety & IP Audit | 5 days |
| **5** | Adjudication Board Chamber | Adjudicator | Quorum Vote (>= 3/4) | 4 days |
| **6** | Sandbox Pilot Deployment | Evaluator | Controlled Cohort Validation | 30 days |
| **7** | Capital Disbursement & Implementation | Administrator | Tranche Milestone Sign-off | 14 days |
| **8** | Impact Measurement & Audit | Evaluator | Verified Employment Records | 90 days |
| **9** | Statutory Archive | Administrator | Final Repayment & Knowledge Ledger | 365 days |

> **Notes**:
> - New citizen submissions always start at **Stage 1** in the Administrator's **Ideas Queue**.
> - Ideas passed forward by an Evaluator for board sign-off enter **Stage 5 (`Adjudication Board Chamber`)** on the Adjudicator side.
> - An alternate **Fast-Track Youth Entrepreneurship Grant (BWP < 500k)** 5-stage workflow cycle can also be activated by an Administrator. Any workflow changes update Submitter, Evaluator, and Adjudicator views automatically.

---

## 5. Citizen Submitter Guide

When signed in as a **Submitter**, you land on the **Citizen Submitter Portal** (`My Innovation Submissions & Funding Pipeline`).

### 5.1 Submitting a New Innovation
1. Click **Submit New Innovation** in the top-right corner of the portal banner.
2. Fill out the dynamic application form configured by CEDA (such as Project Title, Promoter Name, Botswana Omang National ID, Strategic Economic Sector, Executive Problem & Commercial Value Proposition, CEDA Funding Requested in BWP, Projected Direct Citizen Employment, and Business Plan / Financial Model attachment).
3. Submit the form. Your proposal receives a tracking code (e.g., `CEDA-INV-2026-XXXX`) and enters **Stage 1** in real time.

### 5.2 Tracking Stage Progress & Statutory Screening
- Select any submission card on the left to inspect its details on the right panel.
- The **Lifecycle Stage (`X/N`)** progress track updates dynamically as Administrators, Evaluators, and Adjudicators review and advance your proposal.
- Stage 2 verification displays status badges such as **CIPA & BURS Verified** or **Rejected at Screening**.
- Click any green completed stage circle to open the **Stage History Inspector** and view timestamps, scores, and decision notes.

### 5.3 Replying to Evaluator Clarifications
- When an Evaluator or Adjudicator sends a clarification request, an alert pill (e.g., `1 New Clarity Message`) and preview banner appear directly on your submission card.
- Click **Reply** or **Open Chat** to respond in real time.

### 5.4 Browsing FAQs & Sending System Feedback
- Click **FAQs** in the portal header to search and filter Administrator-published help articles by category.
- Click **System Feedback** to rate your experience (1–5 stars), pick a category (`Platform Usability`, `Workflow Clarity`, `Review Speed`, `Support & Communication`, or `General`), choose the relevant workflow stage, and submit comments directly to the Administrator.

### 5.5 Contacting Citizen Enquiries & Support
- Click the floating **Enquiries & Support** button at the bottom-right corner of the portal.
- Use quick self-service options (**Status Lookup**, **Screening Help**, **Funding Help**) or open a live enquiry ticket with priority (`Normal`, `High`, `Urgent`).
- Continue conversations in the **Live Threads** tab as Support Agents reply in real time.

---

## 6. Administrator Guide

Administrators operate the **Admin Canvas Workspace**, **Personnel Directory**, **Admin Console**, and **Admin Settings**.

### 6.1 Managing Personnel & Canvas Stations
In the left **Personnel Directory** sidebar:
- Search officials by name, email, or department, or filter by role (`All`, `Evaluator`, `Adjudicator`, `Administrator`, `Agent`).
- Click **+** (**Invite Official**) to create accounts and send email invitations, or use card actions to change roles, suspend/reactivate, or delete users.
- Click **Refresh** (`Sync Directory from Database`) to pull the latest staff list.
- Drag any official onto the canvas (or click to place) to create their active **Station Card**.

### 6.2 Managing Intake Queues (Ideas, Adjudication & Enquiries)
The floating **Intake Queues** panel on the canvas contains three tabs:
1. **Ideas Queue**:
   - Holds newly submitted citizen proposals starting at Stage 1.
   - **Stage 2 CIPA & BURS Screening**: Click **Screen** on an individual idea to inspect or verify CIPA Company Registration, BURS Tax Clearance, and Omang KYC, or run batch screening across queued items.
   - When the **Enforce Stage 2 Statutory Gate** setting is enabled, ideas cannot be assigned to an Evaluator until CIPA & BURS screening passes.
2. **Adjudication Queue**:
   - Holds proposals that have passed Evaluation and are ready for **Stage 5** assignment to an Adjudicator station.
3. **Enquiries Queue**:
   - Displays incoming citizen enquiries from Submitters in real time. Assign enquiries to **Agent** stations manually, or enable **Auto-Dispatch** in Settings.

### 6.3 Assigning, Reassigning & Removing Users
- **Assign**: Drag an idea from the queue onto an Evaluator or Adjudicator station card (or use Batch Assign). Drag an enquiry onto an Agent station card.
- **Reassign**: Drag an assigned idea card from one official's station card and drop it onto another station card. Both UI state and persistent assignments update immediately.
- **Remove Station**: Removing any official's station from the canvas automatically resets that user's persisted queue, returns orphaned active ideas back onto the canvas as unassigned cards (or returns active enquiries back to the Admin queue for Agents), and clears their queue counts so future assignments start clean.

### 6.4 Canvas Tools, Annotations & Saving
- Use the **Bottom Controls Bar** (`Select`, `Pan`, `-`, `%`, `+`, `Fit`, `AI`) and the **Right Tool Dock** to spawn pools (`Evaluator Pool`, `Review Committee`, `Adjudication Board`), place **Zone Banners**, **Sticky Notes**, or **Quick Canvas Stickers** (`Priority Batch`, `Fast-Track Lane`, `SLA Watch`, etc.).
- Use **Undo / Redo** and **Save** in the canvas toolbar; state also synchronizes automatically to PostgreSQL and Firestore.

### 6.5 Admin Settings & Governance Console
- **Admin Console** (top navigation):
  - **Users & Categories**: Manage system accounts and innovation sector categories.
  - **FAQs**: Create, edit, and delete FAQ entries published to the Submitter Portal.
  - **Feedback**: View aggregated Submitter feedback metrics (average rating, satisfaction percentage, breakdown by star rating and category) plus individual submissions.
- **Admin Settings** (gear icon):
  - **General Platform**: Launch **Workflow Architect** (edit/add/reorder stages, roles, criteria, and SLA days dynamically), launch **Citizen Application Form Builder** (customize submitter form fields dynamically), toggle **Stage 2 Statutory Gate** & **Auto-Screen on Ingest**, and run **AI Copilot Queue Verify / Auto-Assign**.
  - **SLA Health & Triggers**: Configure warning and critical SLA day thresholds.
  - **Message Queue & Agents**: Toggle Auto-Dispatch and set max active chats per Agent.
  - **Personnel & Roles** and **Alerts & Notifications**: Inspect alert history or dispatch manual SLA alerts.

---

## 7. Evaluator Guide

1. **Assigned Evaluations Sidebar & Canvas**:
   - Open the left sidebar (**Assigned Evaluations**) to search assigned proposals or filter by `All`, `Urgent SLA`, or `High Capital`.
   - Click any proposal card to review its dossier on the canvas or open the evaluation dialog.
2. **Clarification Chat**:
   - Message the Submitter directly inside the proposal's clarification stream or click quick request buttons (such as requesting CIPA or cashflow records). Messages sync immediately to the Submitter Portal.
3. **Scoring & Advancing (`EvaluatorModal`)**:
   - Score the proposal from `1–10` across four weighted dimensions:
     - **Innovation Score**
     - **Feasibility Score**
     - **Impact Score**
     - **Scalability Score**
   - Document **Strengths**, **Risks & Weaknesses**, and review comments.
   - Choose a **Recommendation** (`Proceed to Expert Review`, `Proceed to Adjudication`, `Request Information`, or `Do Not Proceed`) and submit.
   - Proposals cleared for board sign-off move to **Stage 5 (`Adjudication Board Chamber`)** in the Adjudication Queue.
4. **SLA Alerts**:
   - Watch for SLA warning/critical alerts in the **Notifications Bell** and highlighted SLA indicators on proposal cards.

---

## 8. Adjudicator Guide

1. **Adjudication Workspace**:
   - Adjudicators focus strictly on adjudication stages (**Stage 5: Adjudication Board Chamber** and onward) using the **Adjudication Queue** and **Assigned Adjudications** sidebar—without the Stage 1 Ideas Queue.
   - Switch between **Canvas** view and **Board Adjudication View** (`Stage 5: Board Docket`, `Stage 4: Expert Due Diligence`, `Stage 6: Sandbox Pilots`).
2. **Collaborative Board Scoring & Decision (`AdjudicatorModal`)**:
   - Score each proposal out of **100** across four board criteria (`0–25` each):
     - **Strategic Fit**
     - **Financial Viability**
     - **Commercialization**
     - **Social Impact**
   - Select your vote (**`APPROVE`**, **`REVISE`**, or **`REJECT`**), add notes, and save your panel score. All participating Adjudicators see live panel consensus averages and vote counts.
   - Issue the formal Board Decision (**`Approved for Pilot Phase`**, **`Approved with Conditions`**, **`Deferred`**, or **`Rejected`**) with remarks and disbursement conditions.
   - Advance approved projects into **Pilot Phase**, **Implementation**, **Impact Measurement**, and **Statutory Archive**.

---

## 9. Citizen Support Agent Guide

When signed in as an **Agent**, your workspace opens to the **Agent Console**:

1. **Availability & Capacity**:
   - Toggle your live status in the top-right switcher: **`Available`**, **`Busy`**, or **`Offline`**.
   - Monitor **Message Queue** (pending unassigned enquiries) and **Capacity** (`Active / Max` concurrent chats).
2. **Handling Live Citizen Enquiries**:
   - Enquiries assigned by the Administrator (or auto-dispatched) appear in your **Active Enquiries** list in real time.
   - Click a thread to view the Submitter's question, associated proposal code/title, and priority badge.
   - Type a reply and press **Send**—messages deliver immediately to the Submitter's **Enquiries & Support** widget.
   - Once an enquiry is addressed, click **Mark Resolved** to archive it to your resolved tab and free up chat capacity.

---

## 10. Real-Time Workspace Collaboration

Administrators, Evaluators, and Adjudicators can collaborate live inside the same workspace:

1. **Inviting Collaborators**:
   - Open **Workspace Share** from the workspace controls to invite colleagues by email or share workspace access.
2. **Active Collaborator Circles (Top Bar)**:
   - Only collaborators actively present in the workspace appear as **stacked circular avatars** in the top navigation bar (with online green status dots).
   - Click the avatar stack to open the collaborator popover:
     - **Workspace Owner**: Click **Remove** next to any invited collaborator to end their access immediately, or click **Manage** to adjust sharing settings.
     - **Invited Collaborator**: Click **My Workspace** to return to your own workspace at any time, or **Cancel Collab** to leave the shared workspace.

---

## 11. Workspace AI Copilot

Available to **Administrators**, **Evaluators**, and **Adjudicators** via the **AI** button in the bottom floating canvas pill (and inside **Admin Settings**):

- **Live Cross-Workspace Index**: The AI Copilot indexes active personnel workloads, queue ideas, adjudication queue items, SLA deadlines across Evaluator and Adjudicator stations, workflow stages, form builder fields, FAQs, and submitted system feedback.
- **Example Questions You Can Ask**:
  - *"How many evaluators or adjudicators are behind on their SLAs?"*
  - *"Which ideas in the queue are unverified for CIPA & BURS?"*
  - *"Summarize our current workflow stages, application form fields, and FAQs."*
- **AI Automation Actions (Administrator Settings)**:
  - Administrators can run **Verify & Screen Queue Ideas** or **Auto-Assign Queue Ideas** directly from **Admin Settings** or via Copilot prompts (when allowed in Settings).

---

## 12. Keyboard Shortcuts & Canvas Navigation

Press the shortcuts button (or inspect **Keyboard Shortcuts & Guide**) while on the canvas:

| Shortcut | Action |
| :---: | :--- |
| **`V`** | Select / Inspect tool (click or drag marquee box to group cards) |
| **`H`** or **`Space`** | Hand / Pan tool |
| **`N`** | New Proposal modal |
| **`C`** | Connect Cards (dependency wires) |
| **`S`** | Place Sticky Note memo |
| **`Shift + 1`** | Fit canvas to screen |
| **`Ctrl / Cmd + Scroll`** | Zoom in / out smoothly |

---

## 13. Troubleshooting

- **AI Copilot cannot reach OpenAI**: Verify the backend server (`npm run dev`) is running and `OPENAI_API_KEY` in `.env` is valid and has available quota.
- **Changes not showing across tabs**: Ensure both tabs are running on the same app server with network/Firestore connectivity enabled; stage updates, assignments, notifications, and citizen enquiries sync via Firestore and cross-tab broadcast channels.
- **Cannot assign an idea to an Evaluator**: Check whether the **Enforce Stage 2 Statutory Gate** toggle is active in **Admin Settings**. If enabled, run Stage 2 CIPA & BURS screening on the idea first.
- **Official sees stale queue items after testing**: Remove the official's station from the Admin canvas (which resets their queue) before placing them back on the canvas and assigning new ideas.
