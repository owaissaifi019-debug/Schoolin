# Architecture Decision Record (ADR)
## Title: 2026-07 Project Architecture Selection

* **Date**: July 2026
* **Status**: Approved / Implemented

---

## 1. Problem
Selecting a scalable, low-overhead client-server framework to support both desktop browsers and Android native wraps. The stack must enable real-time messaging, role-based database constraints, and rapid design changes without heavy compilation requirements.

---

## 2. Decision
Implement a **Serverless Static-App client** connecting directly to **Supabase** via the Javascript SDK, packaged for mobile using **Capacitor CLI**:
* **Frontend**: Vanilla HTML5, CSS3, and ES6 Javascript. No Node.js rendering servers.
* **Backend**: Supabase (PostgreSQL tables, storage buckets, triggers, functions, and RLS policies).
* **Mobile Wrap**: Capacitor Android project wrapping the frontend code directly in webview blocks.

---

## 3. Reasoning
* **Zero Server Overhead**: The static frontend can be deployed globally via CDNs (Vercel, Netlify) for near-instant load speeds.
* **Security at the Database Layer**: Using Row-Level Security (RLS) ensures that all access and modification rules are defined in PostgreSQL schemas. Clients cannot bypass these rules even if client JS code is decompiled or modified.
* **Realtime Out-of-the-Box**: Supabase Realtime Channels support instant WebSockets communication for messaging without hosting dedicated socket engines.
* **Mobile Portability**: Capacitor allows compile-free syncing of web files, accelerating mobile testing workflows.

---

## 4. Alternatives Considered
* **Node.js Express backend + React SPA**: Rejected due to hosting costs, database connection limits, and additional architectural layers.
* **Flutter Hybrid Web/App**: Rejected due to the development team's expertise in HTML/CSS/JS and the requirement to maintain a highly responsive, custom CSS visual style sheet easily.

---

## 5. Future Implications
* Updates to security policies must be written as SQL migration files and executed directly in the database.
* Scale-out requirements are offloaded entirely to Supabase database scaling.
* Frontend bundle sizes remain tiny since there are no heavy compile-time framework footprints.
