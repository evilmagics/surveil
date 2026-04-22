# 👁️ Surveil

**Surveil** is a modern surveillance camera management platform built for performance, premium aesthetics, and scalability. It leverages a hybrid **Tauri + Rust** architecture for robust system performance and **React 19** for a stunning user interface.

---

## ✨ Key Features

- 🎥 **Multi-Protocol Streaming:** Supports RTSP, RTMP, and HLS through MediaMTX integration.
- 🚀 **High Performance:** Efficient Rust backend with asynchronous data processing.
- 🎨 **Premium UI/UX:** Modern interface using HeroUI v3 and MagicUI with native Dark Mode support.
- 🛠️ **Cross-Platform:** Available for Windows, macOS, and Linux.
- 📂 **Local First:** Local SQLite database for maximum security and data privacy.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | [Tauri v2](https://v2.tauri.app/) |
| **Backend** | [Rust](https://www.rust-lang.org/) |
| **Frontend** | [React 19](https://react.dev/), [Vite 6](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Components** | [HeroUI v3](https://heroui.com/), [MagicUI](https://magicui.design/) |
| **Media Server** | [MediaMTX](https://github.com/bluenviron/mediamtx) |
| **Database** | SQLite (Rusqlite) |

---

## 🚀 Quick Start

Ensure you have [Rust](https://www.rust-lang.org/tools/install) and [Bun](https://bun.sh/) installed.

```bash
# 1. Clone the repository
git clone https://github.com/evilmagics/surveil.git
cd surveil

# 2. Install dependencies & setup sidecar binaries
bun install
bun run setup-bins

# 3. Run the application in development mode
bun tauri dev
```

---

## 📚 Complete Documentation

More detailed explanations can be found in the `docs/` folder:

1.  📖 **[Overview & Tech Stack](docs/introduction.md)** - Deep dive and technology list.
2.  🏗️ **[System Architecture](docs/architecture.md)** - How Surveil works under the hood.
3.  ⚙️ **[Installation Guide](docs/installation.md)** - Installation steps and system requirements.
4.  🎮 **[Usage Guide](docs/usage.md)** - Walkthrough of features and app navigation.
5.  🔧 **[Troubleshooting & FAQ](docs/maintenance.md)** - Solutions to common issues and Q&A.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
