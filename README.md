# FrameForge — Cricket Video Temporal Forensics Engine 🏏🔍

**FrameForge** is an advanced video analysis tool designed for hackathons and forensic applications to detect temporal inconsistencies in cricket match footage. It identifies frame drops, frame merges (frozen frames), and sudden clarity loss with high precision using computer vision techniques.

## 🚀 Features

-   **Frame Drop Detection**: Uses **Dense Optical Flow (Farneback)** to detect sudden spikes in motion magnitude, signaling missing temporal data.
-   **Frame Merge Identification**: Detects repeated or "frozen" frames by identifying near-zero motion in active sequences.
-   **Clarity Forensics**: Monitors **Laplacian Variance** to flag sudden blur or encoding artifacts.
-   **Annotated Video Generation**: Automatically generates a forensic version of the uploaded video with real-time overlays and severity badges.
-   **Comprehensive Analytics**: Provides a detailed JSON report with health scores, error counts, and per-frame classification.
-   **Modern Dashboard**: A sleek, dark-mode web interface for seamless uploads and interactive report viewing.

## 🛠️ Technology Stack

-   **Backend**: Node.js & Express
-   **Computer Vision**: Python 3.10+, OpenCV (`cv2`), NumPy
-   **Frontend**: Vanilla JavaScript, HTML5, CSS3 (Modern Glassmorphism Design)
-   **Algorithms**: Farneback Dense Optical Flow, Laplacian focus measure, Adaptive Temporal Sampling.

## 📦 Installation & Setup

### Prerequisites
-   Python 3.10+
-   Node.js (v16+)
-   Git

### Setup Steps
1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Menagashanumgam/frameforge-hackathon.git
    cd frameforge-hackathon
    ```

2.  **Install Python Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Install Node.js Dependencies**
    ```bash
    npm install
    ```

4.  **Run the Application**
    ```bash
    npm start
    ```
    The application will be available at `http://localhost:3000`.

## 🧠 Detection Approach

FrameForge employs a **Hybrid Optical-Flow + Temporal-Statistical Analysis** pipeline:
1.  **Motion Vectors**: We compute per-pixel motion vectors to find the global energy between frames.
2.  **Statistical Baselines**: The engine establishes a baseline for motion and blur across the sequence.
3.  **Anomaly Scoring**: Frames exceeding 4 standard deviations from the motion mean are flagged as "Frame Drops".
4.  **Forensic Overlay**: Every detected error is burnt into a forensic output video for visual verification.

## 📄 License
ISC License - Feel free to use and modify for hackathons and research.

---
*Built with ❤️ for the Video Forensics Hackathon.*
