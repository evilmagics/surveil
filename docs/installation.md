# Installation Guide

This page explains the steps to set up the development environment and run Surveil from the source code.

## 📋 Prerequisites
Before starting, ensure your system has the following components:

1.  **Rust:** Install via [rustup.rs](https://rustup.rs/). Surveil requires the latest Stable version of Rust.
2.  **Bun:** The JavaScript runtime and package manager used in this project. Install via [bun.sh](https://bun.sh/).
3.  **Build Tools:**
    - **Windows:** Install *C++ Build Tools* via the Visual Studio Installer.
    - **Linux:** Install Tauri dependencies (such as `webkit2gtk`, `libsoup`, etc. See [Tauri Docs](https://v2.tauri.app/start/prerequisites/)).
    - **macOS:** Install Xcode Command Line Tools.

## ⚙️ Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/evilmagics/surveil.git
cd surveil
```

### 2. Install Dependencies
Use Bun to install all frontend libraries and Tauri tooling:
```bash
bun install
```

### 3. Setup Sidecar Binary (Important!)
Surveil requires **MediaMTX** to run. We provide an automatic script to download the binary appropriate for your platform:
```bash
bun run setup-bins
```
*This script will download MediaMTX from GitHub and place it in `src-tauri/bin` as a Tauri sidecar.*

### 4. Running in Development Mode
Run the following command to open the application in dev mode with *Hot Module Replacement* (HMR):
```bash
bun tauri dev
```

## 📦 Building the Application
To create a ready-to-distribute executable installer:
```bash
bun tauri build
```
The build results (such as `.exe`, `.msi`, `.dmg`, or `.deb`) will be available in the `src-tauri/target/release/bundle/` folder.
