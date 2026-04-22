# Introduction & Tech Stack

Surveil is designed to be a lightweight yet powerful Video Management System (VMS) solution. Unlike traditional VMS software that is often bloated and uses outdated UIs, Surveil prioritizes user experience (UX) without sacrificing system performance.

## 🌟 Project Philosophy
This project was born from the need for a "Local First," transparent camera management application with a modern aesthetic on par with today's top-tier SaaS applications.

## 🛠️ Tech Stack Details

### Frontend (UI Layer)
Using the latest web standards to ensure a responsive and interactive interface:
- **React 19:** Leverages the latest concurrent rendering features for a smooth UI.
- **Vite 6:** Ultra-fast bundler for an instant development experience.
- **HeroUI v3 (formerly NextUI):** A collection of accessible and beautiful React-based UI components.
- **MagicUI:** Premium animation components to add a "wow" factor to the application.
- **Tailwind CSS v4:** The next-generation CSS engine that is faster and more powerful.
- **Zustand:** Minimalist and performant state management for camera data.

### Backend (Logic & OS Layer)
Harnessing the security and speed of Rust to interact with the operating system:
- **Tauri v2:** A framework for building secure desktop applications with extremely small binary sizes.
- **Rust:** A system language that guarantees memory safety and high performance.
- **Tokio:** An asynchronous runtime for handling multiple simultaneous streaming processes.
- **Rusqlite:** SQLite driver for storing camera metadata and user preferences locally.

### Infrastructure & Media
- **MediaMTX (Sidecar):** A ready-to-use media server that handles stream protocol conversion and distribution (RTSP, HLS, WebRTC).
- **SQLite:** A serverless database stored in a single file, facilitating easy backups and data portability.

## 📁 Directory Structure
- `src/`: Frontend source code (React).
- `src-tauri/`: Backend source code (Rust) and desktop application configuration.
- `scripts/`: Helper scripts for development automation (such as downloading MediaMTX binaries).
- `docs/`: Technical documentation and user guides.
