# Sree Meditec Enterprise Dashboard (Medequip CRM)
*Comprehensive ERP and CRM solution tailored for Medical Equipment Enterprises.*

## 1. Project Overview & Purpose
The **Sree Meditec Enterprise Dashboard** is a full-fledged Customer Relationship Management (CRM) and Enterprise Resource Planning (ERP) application engineered explicitly for companies operating in the medical equipment sector. 

Its primary purpose is to consolidate all core business functions—ranging from sales and vendor management to inventory, field service, document generation, and human resources—into a single, unified, and highly secure workspace. It empowers administrators to have complete oversight over operations and allows employees to efficiently manage their daily responsibilities.

---

## 2. Core Features & Technology Stack

### Technology Stack
- **Frontend Framework:** React 18, Vite.js
- **Styling:** Tailwind CSS (Premium glassmorphic themes, dark/light mode adaptable)
- **Routing:** React Router DOM
- **Backend & Database:** Google Firebase (Firestore)
- **PDF Generation:** jsPDF & jsPDF-AutoTable
- **AI Integration:** Google GenAI (`@google/genai`) for smart integrations and tasks.
- **Data Visualization:** Recharts for performance and analytics metrics.

---

## 3. Functionality & Modules

The platform is divided into four main functional pillars, securely separated via Role-Based Access Control (RBAC).

### A. Main Modules (CRM & Operations)
- **Role-Based Dashboard:** Tailored views for Admins (system oversight) vs. Employees (task and performance focus).
- **Lead CRM:** Track prospective sales, log follow-ups (Calls, WhatsApp, Meetings), and monitor lead conversions from "New" to "Won" or "Lost."
- **Client & Vendor Database:** Centralized directories to manage hospital/clinic details, GSTINs, and supplier information.
- **Inventory Management:** Full lifecycle tracking of hardware, consumables, and spare parts. Includes minimum stock level alerts, location tracking, and tracking of distinct stock movements (In/Out, Restock/Sale).

### B. Doc Maker (Automated Documentation Generation)
A dedicated suite bypassing traditional manual document production. It automates templating, calculation of GST/Tax, and finalizes records as PDFs.
- **Invoice Maker (Billing):** Create standardized, tax-compliant billing documents for customers.
- **Quotation Maker:** Generate dynamic cost estimates and equipment pricing for new leads.
- **Purchase Order Builders:** Maintain separate modules for formalizing Customer Purchase Orders and Supplier Purchase Orders.
- **Field Reporting:**
  - *Service Order & Report Maker:* Standardized reporting for engineers visiting client locations for maintenance or troubleshooting.
  - *Installation Report Maker:* Formal tracking of equipment setup, warranty validations, and trained medical personnel upon delivery.
  - *Delivery Challan:* Produce itemized dispatch logs out for delivery.

### C. Workspace (Employee Productivity)
- **Task Manager:** Allows assignment, progress tracking (To Do, In Progress, Review, Done), and priority management of internal tasks.
- **Attendance (Check-in/Out):** Dedicated time tracking module capturing clock-ins for Remote, Field, or Office duties.
- **Vouchers (Expenses):** Module for employees to submit out-of-pocket expenses (Travel, Food, Lodging) with integrated approval/rejection workflows by Admins.
- **Leaderboard (Performance):** A gamified metric tracking module motivating employees by calculating points earned via task completion, attendance streaks, and sales revenue.

### D. Control (Administration)
- **Staff Management (HR):** System Admins can add new personnel, designate roles (`SYSTEM_ADMIN` or `SYSTEM_STAFF`), manage granular module permissions, handle login states, and securely manage system access.

---

## 4. Pros & Advantages

1. **Centralized Data Ecosystem:** Replaces disparate spreadsheets and multiple third-party tools by bringing leads, customer data, inventory, and HR functions into one cohesive platform.
2. **Accelerated Workflow & Paperless Operations:** Features like automated PDF generation for Delivery Challans, Service Reports, and Invoices radically streamline the speed at which the business operates in the field.
3. **High Security & Granular Privacy:** Admins decide exactly which tabs an employee can view or edit down to specific modules, keeping financial and sensitive data protected.
4. **Enhanced Field Engineering Productivity:** With specialized modules for Service and Installation Reports, on-the-go mechanics and engineers can finalize comprehensive logs directly on the platform immediately after servicing equipment at a hospital.
5. **Employee Motivation:** The gamified "Performance Leaderboard" transparently tracks points tied to attendance, successful leads, and completed tasks, fostering an engaging company culture.
6. **Future-Proof AI Ready:** Built with the Google Gemini API, allowing the company to easily extend capabilities (like automated report summarization, smart data extraction, or predictive inventory planning) directly within the application.

---

## 5. What Makes This Platform Special? (Unique Selling Propositions)

While there are many CRMs and ERPs on the market, the **Sree Meditec Enterprise Dashboard** differentiates itself through deep industry-specific customization:

1. **Hyper-Specialized for Medical Equipment Operations**
   Generic CRMs (like Salesforce or HubSpot) often lack natively built modules tailored for medical devices. This platform handles the *entire, exact* lifecycle directly: from standard Quotations to complex Installation validation (training hospital staff) and recurring Maintenance/Service logs, removing the need for 3rd-party workarounds.

2. **Automated, Compliant "Doc Maker" Ecosystem**
   In the field of medical equipment, generating compliant PDF documentation fast is critical. Instead of having separate software for billing, purchase orders, delivery challans, and service reports, the system automatically builds all of these, complete with standardized GST/Tax calculation and PDF output, within seconds.

3. **Gamification of Daily Operations**
   It innovatively addresses employee engagement by directly tying mundane aspects like "clocking in on time" (Attendance) and "working a lead" to a robust points-and-leaderboard system. This subtle gamification provides powerful motivation specifically for sales and field service reps.

4. **Niche Field-Service Integration**
   Through specialized Service Order Maker and Installation Report modules, engineers can fill out exact variables (such as "Software Version," "Machine Warranty Status," "Action Hardware," and "Spares Charges") on-site at hospitals/clinics and immediately close out highly professional reports, bridging the gap between back-office and physical field maintenance smoothly.

5. **Integrated AI Architecture**
   Through the `@google/genai` library embedded natively, it leapfrogs competitors by treating AI not as an afterthought but as a core component ready to provide smart assistance, generative documentation insights, and task summarization directly onto the users' dashboards.
