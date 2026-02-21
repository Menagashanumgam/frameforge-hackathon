import cv2
import numpy as np
import json
import sys
import os
import time


def analyze_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video file. Ensure codec compatibility."}

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if total_frames <= 0:
        return {"error": "Video file appears to be empty or corrupted."}

    results = []
    raw_frames = []  # Store frames for annotated video generation
    prev_gray = None

    # Adaptive sampling for very long videos to maintain performance
    skip_factor = 1
    if total_frames > 2000:
        skip_factor = 2
    if total_frames > 5000:
        skip_factor = 5

    frame_idx = 0
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % skip_factor != 0:
            frame_idx += 1
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Laplacian variance for blur/merge detection (Focus Measure)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Frame brightness (to detect black frames/flicker)
        brightness = np.mean(gray)

        flow_magnitude = 0.0
        if prev_gray is not None:
            # Dense Optical Flow (Farneback) - downsized for speed
            small_gray = cv2.resize(gray, (0, 0), fx=0.5, fy=0.5)
            small_prev = cv2.resize(prev_gray, (0, 0), fx=0.5, fy=0.5)
            flow = cv2.calcOpticalFlowFarneback(
                small_prev, small_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
            )
            mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            flow_magnitude = np.mean(mag)

        results.append({
            "frame": frame_idx,
            "timestamp": frame_idx / fps if fps > 0 else 0,
            "blur_score": float(laplacian_var),
            "motion_score": float(flow_magnitude),
            "brightness": float(brightness),
        })

        raw_frames.append(frame.copy())
        prev_gray = gray
        frame_idx += 1

    cap.release()

    # ── Post-Analysis for Anomaly Detection ──
    errors = []

    motion_scores = [r["motion_score"] for r in results]
    blur_scores = [r["blur_score"] for r in results]

    if not motion_scores:
        return {"error": "No frames were processed."}

    avg_motion = np.mean(motion_scores)
    std_motion = np.std(motion_scores)
    avg_blur = np.mean(blur_scores)
    std_blur = np.std(blur_scores)

    for i in range(1, len(results)):
        r = results[i]

        # 1. Frame Drop Detection (High motion jump vs average)
        if r["motion_score"] > avg_motion + 4 * std_motion and r["motion_score"] > 2.0:
            errors.append({
                "frame": r["frame"],
                "timestamp": r["timestamp"],
                "type": "Frame Drop",
                "severity": "High",
                "confidence": 0.85,
                "description": f"Abnormal temporal gap detected (Motion Spike: {r['motion_score']:.2f})",
            })

        # 2. Frame Merge / Frozen Frame Detection
        if r["motion_score"] < 0.001 and avg_motion > 0.1:
            errors.append({
                "frame": r["frame"],
                "timestamp": r["timestamp"],
                "type": "Frame Merge",
                "severity": "Medium",
                "confidence": 0.75,
                "description": "Static frame detected in high-motion sequence.",
            })

        # 3. Sudden Blur Detection (Dropping focus)
        if r["blur_score"] < avg_blur - 2 * std_blur and r["blur_score"] < 100:
            errors.append({
                "frame": r["frame"],
                "timestamp": r["timestamp"],
                "type": "Clarity Error",
                "severity": "Low",
                "confidence": 0.60,
                "description": "Significant loss of texture/clarity.",
            })

    # ── Per-frame classification ──
    error_frames = {}
    for err in errors:
        f = err["frame"]
        if f not in error_frames:
            error_frames[f] = err["type"]

    classification_counts = {
        "Normal": 0, "Frame Drop": 0, "Frame Merge": 0, "Clarity Error": 0
    }
    for r in results:
        label = error_frames.get(r["frame"], "Normal")
        r["classification"] = label
        classification_counts[label] = classification_counts.get(label, 0) + 1

    # Downsample to max 200 points for the frontend classification table
    step = max(1, len(results) // 200)
    frame_classifications = [
        {
            "frame": r["frame"],
            "timestamp": round(r["timestamp"], 3),
            "classification": r["classification"],
            "motion_score": round(r["motion_score"], 4),
            "blur_score": round(r["blur_score"], 2),
            "brightness": round(r["brightness"], 2),
        }
        for r in results[::step]
    ]

    # ══════════════════════════════════════════════════════
    # GENERATE ANNOTATED OUTPUT VIDEO
    # ══════════════════════════════════════════════════════
    annotated_path = None
    try:
        base_dir = os.path.dirname(video_path)
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        annotated_filename = f"{base_name}_annotated.mp4"
        annotated_path = os.path.join(base_dir, annotated_filename)

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out_fps = fps if fps > 0 else 30.0
        writer = cv2.VideoWriter(annotated_path, fourcc, out_fps, (width, height))

        # Build a quick lookup: result index -> classification
        result_frame_map = {r["frame"]: r for r in results}

        # Colour overlays by classification type
        overlay_colors = {
            "Frame Drop":    (0, 0, 255),    # Red
            "Frame Merge":   (0, 180, 255),  # Amber/Orange
            "Clarity Error": (255, 140, 0),  # Blue
        }

        for idx, frm in enumerate(raw_frames):
            r_info = results[idx] if idx < len(results) else None
            if r_info is None:
                writer.write(frm)
                continue

            cls = r_info.get("classification", "Normal")
            annotated = frm.copy()

            if cls != "Normal":
                # Draw translucent coloured border overlay
                color = overlay_colors.get(cls, (0, 0, 255))
                overlay = annotated.copy()
                border = 8
                cv2.rectangle(overlay, (0, 0), (width, height), color, border * 2)
                cv2.addWeighted(overlay, 0.7, annotated, 0.3, 0, annotated)

                # Top banner
                banner_h = 50
                cv2.rectangle(annotated, (0, 0), (width, banner_h), color, -1)
                cv2.addWeighted(
                    annotated[0:banner_h, :], 0.6,
                    frm[0:banner_h, :], 0.4,
                    0,
                    annotated[0:banner_h, :]
                )

                # Text on banner
                label_text = f"[{cls.upper()}] Frame {r_info['frame']} | T={r_info['timestamp']:.2f}s"
                cv2.putText(
                    annotated, label_text,
                    (15, 33), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (255, 255, 255), 2, cv2.LINE_AA
                )

                # Severity badge (bottom-right)
                err_match = [e for e in errors if e["frame"] == r_info["frame"]]
                if err_match:
                    sev_text = f"Severity: {err_match[0]['severity']} | Conf: {err_match[0]['confidence']:.0%}"
                    text_size = cv2.getTextSize(sev_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                    cv2.rectangle(
                        annotated,
                        (width - text_size[0] - 20, height - 40),
                        (width, height),
                        color, -1
                    )
                    cv2.putText(
                        annotated, sev_text,
                        (width - text_size[0] - 10, height - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                        (255, 255, 255), 1, cv2.LINE_AA
                    )
            else:
                # Normal frame — small green indicator
                cv2.circle(annotated, (width - 20, 20), 8, (0, 220, 100), -1)

            writer.write(annotated)

        writer.release()
    except Exception as e:
        sys.stderr.write(f"Warning: Could not generate annotated video: {e}\n")
        annotated_path = None

    # ── Final Report Meta ──
    duration = time.time() - start_time

    report = {
        "summary": {
            "total_frames": total_frames,
            "processed_frames": len(results),
            "fps": fps,
            "error_count": len(errors),
            "processing_time": f"{duration:.2f}s",
            "health_score": max(0, 100 - (len(errors) * 2)),
            "classification_counts": classification_counts,
        },
        "errors": errors,
        "analytics": results[::max(1, len(results) // 100)],
        "frame_classifications": frame_classifications,
        "approach": {
            "name": "Hybrid Optical-Flow + Temporal-Statistical Analysis",
            "methods": [
                {
                    "name": "Dense Optical Flow (Farneback)",
                    "target": "Frame Drop Detection",
                    "description": "Computes per-pixel motion vectors between consecutive frames using the Farneback algorithm. A sudden spike in mean flow magnitude (>4 standard deviations above average) indicates missing intermediate frames — a temporal gap or frame drop."
                },
                {
                    "name": "Zero-Motion Statistical Detection",
                    "target": "Frame Merge / Freeze Detection",
                    "description": "Identifies frames with near-zero optical flow magnitude in sequences that otherwise contain significant motion. This detects duplicate/merged frames where the same image is rendered multiple times, indicating a frozen or repeated frame."
                },
                {
                    "name": "Laplacian Variance (Focus Measure)",
                    "target": "Clarity / Blur Error Detection",
                    "description": "Computes the variance of the Laplacian operator on each grayscale frame. A sharp drop below the statistical baseline (>2 std deviations) flags frames with abnormal blur, indicating potential encoding artifacts or motion blur from frame interpolation."
                },
                {
                    "name": "Adaptive Temporal Sampling",
                    "target": "Performance Optimization",
                    "description": "For videos exceeding 2000 frames, an adaptive skip factor is applied to maintain real-time analysis capability without sacrificing detection accuracy on key anomaly types."
                }
            ],
            "pipeline": "Video → Frame Extraction → Grayscale Conversion → Optical Flow Analysis → Statistical Anomaly Detection → Per-Frame Classification → Annotated Video Generation → JSON Report"
        },
    }

    if annotated_path and os.path.exists(annotated_path):
        report["annotated_video"] = os.path.basename(annotated_path)

    return report


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video path provided"}))
        sys.exit(1)

    video_path = sys.argv[1]
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"File not found: {video_path}"}))
        sys.exit(1)

    try:
        report = analyze_video(video_path)
        print(json.dumps(report))
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))
