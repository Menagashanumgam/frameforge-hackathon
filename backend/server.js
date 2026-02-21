const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
// Allow all origins for public deployment
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is alive' });
});

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoPath = req.file.path;
    const detectorPath = path.join(__dirname, '..', 'detector.py');

    console.log(`Analyzing video: ${videoPath}`);

    // Use python3 on Linux (Render), fallback to python on Windows
    const isWindows = process.platform === 'win32';
    const possiblePythonPaths = isWindows
        ? [
            "C:\\Users\\menaga\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe",
            "C:\\Python313\\python.exe",
            "python"
        ]
        : ["python3", "python"];
    const fs2 = require('fs');
    const pythonExe = possiblePythonPaths.find(p => !p.includes('\\') || p === 'python' || p === 'python3' || fs2.existsSync(p)) || 'python3';
    console.log(`Spawning Python: ${pythonExe}`);
    console.log(`Script Path: ${detectorPath}`);
    console.log(`Video File: ${path.resolve(videoPath)}`);

    const pythonProcess = spawn(pythonExe, [detectorPath, path.resolve(videoPath)]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        const str = data.toString();
        errorData += str;
        console.error(`[PYTHON STDERR]: ${str}`);
    });

    pythonProcess.on('error', (err) => {
        console.error(`Failed to start Python process: ${err.message}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process closed with exit code ${code}`);
        if (code !== 0) {
            console.error(`Python script error output: ${errorData}`);
            return res.status(500).json({
                error: 'Analysis failed',
                details: errorData || 'Unknown Python error',
                exitCode: code
            });
        }

        try {
            if (!resultData.trim()) {
                throw new Error("Python script returned no data");
            }
            const report = JSON.parse(resultData);
            report.videoUrl = `http://localhost:${port}/uploads/${path.basename(videoPath)}`;
            // Add annotated video URL if it was generated
            if (report.annotated_video) {
                report.annotatedVideoUrl = `http://localhost:${port}/uploads/${report.annotated_video}`;
            }
            res.json(report);
        } catch (e) {
            console.error(`Error parsing JSON: ${e.message}. Raw output: ${resultData}`);
            res.status(500).json({
                error: 'Failed to parse analysis results',
                message: e.message,
                rawOutput: resultData.substring(0, 500) // snippet for debugging
            });
        }
    });
});

// Serve uploaded videos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend_vanilla')));

// Wildcard route to serve index.html for client-side routing
app.get(/^\/(?!api|health|uploads).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend_vanilla', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`FrameForge running at http://0.0.0.0:${port}`);
});
