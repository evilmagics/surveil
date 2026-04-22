# Usage Guide

Use this guide to understand how to operate the Surveil application once it is running.

## ➕ Adding a New Camera
1.  Click the **"Add Camera"** button (plus icon) on the main dashboard.
2.  Select the appropriate Tab (e.g., RTSP).
3.  Enter the camera details:
    - **Name:** Provide a unique name (e.g., "Parking Camera").
    - **Stream URL:** The camera's stream address (example: `rtsp://admin:password@192.168.1.10:554/live`).
    - **Description:** Additional notes if needed.
4.  Click **"Save Camera"**. The application will attempt an initial connection and save the data to the database.

## 📺 Viewing Streams
- Newly added cameras will appear as cards on the Dashboard.
- Click on a camera card to open details and start the stream.
- **Theater Mode:** Click the full-screen icon on the player to enter a focused mode that minimizes other UI elements.

## ⚙️ Managing Settings (Preferences)
Use the **Preferences** menu to adjust application behavior:
- **UI Preferences:** Change themes (Light/Dark mode) or animations.
- **System Settings:** Technical settings related to camera status check intervals.

## ✏️ Editing or Deleting a Camera
1.  Open the context menu (three-dot icon) on the camera card or via the detail sidebar.
2.  Select **"Edit"** to change information or **"Delete"** to remove the camera from the database.
3.  *Note: Deleting a camera will not delete physical recording data if the recording feature is enabled.*

## 🛠️ Usage Tips
- Use the **Search** feature if you have many cameras to find them by name or location.
- Pay attention to the **Status Indicator** on the camera cards:
    - 🟢 **Connected:** Camera is running normally.
    - 🔴 **Disconnected:** Connection issue (check network or credentials).
    - 🟡 **Connecting:** Attempting to establish a connection.
