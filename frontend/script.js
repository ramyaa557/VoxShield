
console.log("VoxShield script loaded.");

// ==========================================
// DOM ELEMENTS
// ==========================================

const audioFile = document.getElementById("audioFile");
const fileName = document.getElementById("fileName");

const uploadMode = document.getElementById("uploadMode");
const recordMode = document.getElementById("recordMode");

const uploadPanel = document.getElementById("uploadPanel");
const recordPanel = document.getElementById("recordPanel");

const analyzeBtn = document.getElementById("analyzeBtn");
const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordStatus = document.getElementById("recordStatus");
const timer = document.getElementById("timer");

const audioPreview = document.getElementById("audioPreview");
const loading = document.getElementById("loading");

const resultCard = document.getElementById("resultCard");
const prediction = document.getElementById("prediction");
const confidence = document.getElementById("confidence");
const confidenceBar = document.getElementById("confidenceBar");
const message = document.getElementById("message");

const resetBtn = document.getElementById("resetBtn");

// ==========================================
// BACKEND URL
// ==========================================

const API_URL = "https://voxshield-wbra.onrender.com/predict";

// ==========================================
// VARIABLES
// ==========================================

let currentMode = "upload";
let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let recordedFile = null;
let recordingStream = null;
let recordingTimer = null;
let recordingSeconds = 0;
let previewURL = null;

// ==========================================
// UPLOAD MODE
// ==========================================

uploadMode.addEventListener("click", () => {
    currentMode = "upload";

    uploadMode.classList.add("active");
    recordMode.classList.remove("active");

    uploadPanel.style.display = "block";
    recordPanel.style.display = "none";

    stopRecordingIfNeeded();
});

// ==========================================
// RECORD MODE
// ==========================================

recordMode.addEventListener("click", () => {
    currentMode = "record";

    recordMode.classList.add("active");
    uploadMode.classList.remove("active");

    uploadPanel.style.display = "none";
    recordPanel.style.display = "block";
});

// ==========================================
// FILE SELECTION
// ==========================================

audioFile.addEventListener("change", () => {
    if (audioFile.files && audioFile.files.length > 0) {
        const file = audioFile.files[0];

        fileName.textContent = file.name;

        console.log("Selected file:", file.name);
        console.log("File type:", file.type);
        console.log("File size:", file.size);
    } else {
        fileName.textContent = "No file selected";
    }
});

// ==========================================
// RECORD BUTTON
// ==========================================

recordBtn.addEventListener("click", async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        await startRecording();
    } else {
        stopRecording();
    }
});

// ==========================================
// START RECORDING
// ==========================================

async function startRecording() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error(
                "Microphone recording requires HTTPS or localhost."
            );
        }

        recordingStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false
            }
        });

        audioChunks = [];
        recordedBlob = null;
        recordedFile = null;

        let mimeType = "";

        const supportedTypes = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
            "audio/ogg"
        ];

        for (const type of supportedTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                break;
            }
        }

        mediaRecorder = mimeType
            ? new MediaRecorder(recordingStream, { mimeType })
            : new MediaRecorder(recordingStream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const actualType = mediaRecorder.mimeType || "audio/webm";
            const extension = actualType.includes("ogg") ? "ogg" : "webm";

            recordedBlob = new Blob(audioChunks, { type: actualType });

            recordedFile = new File(
                [recordedBlob],
                `voxshield_recording.${extension}`,
                { type: actualType }
            );

            if (previewURL) {
                URL.revokeObjectURL(previewURL);
            }

            previewURL = URL.createObjectURL(recordedBlob);
            audioPreview.src = previewURL;
            audioPreview.style.display = "block";

            recordStatus.textContent = "Recording ready for analysis";
            recordBtn.textContent = "Start Recording";
            recordIcon.textContent = "🎙";

            stopTimer();
            releaseMicrophone();

            console.log("Recording completed:", recordedFile.name);
            console.log("Recorded size:", recordedBlob.size);
            console.log("Recorded type:", recordedBlob.type);
        };

        mediaRecorder.start(250);

        recordStatus.textContent = "Recording... Speak clearly";
        recordBtn.textContent = "Stop Recording";
        recordIcon.textContent = "🔴";

        startTimer();

        console.log("Recording started.");
    } catch (error) {
        console.error("Microphone error:", error);

        releaseMicrophone();

        alert(
            "Unable to start recording. Check microphone permission and try again.\n\n" +
            error.message
        );
    }
}

// ==========================================
// STOP RECORDING
// ==========================================

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
}

function stopRecordingIfNeeded() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    } else {
        releaseMicrophone();
    }
}

function releaseMicrophone() {
    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
        recordingStream = null;
    }
}

// ==========================================
// TIMER
// ==========================================

function startTimer() {
    recordingSeconds = 0;
    timer.textContent = "00:00";

    stopTimer();

    recordingTimer = setInterval(() => {
        recordingSeconds++;

        const minutes = Math.floor(recordingSeconds / 60);
        const seconds = recordingSeconds % 60;

        timer.textContent =
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0");
    }, 1000);
}

function stopTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

// ==========================================
// ANALYZE AUDIO
// ==========================================

analyzeBtn.addEventListener("click", async () => {
    console.log("========== ANALYZE STARTED ==========");

    let audioToAnalyze;

    if (currentMode === "upload") {
        if (!audioFile.files || audioFile.files.length === 0) {
            alert("Please select an audio file first.");
            return;
        }

        audioToAnalyze = audioFile.files[0];
    } else {
        if (!recordedFile || !recordedBlob || recordedBlob.size === 0) {
            alert("Please record your voice and stop the recording first.");
            return;
        }

        audioToAnalyze = recordedFile;
    }

    console.log("Audio file:", audioToAnalyze.name);
    console.log("Audio type:", audioToAnalyze.type);
    console.log("Audio size:", audioToAnalyze.size);

    const formData = new FormData();
    formData.append("audio", audioToAnalyze);

    analyzeBtn.disabled = true;
    resultCard.style.display = "none";
    loading.style.display = "block";

    try {
        console.log("Sending audio to Flask:", API_URL);

        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const responseText = await response.text();
            throw new Error(
                `Backend returned a non-JSON response (HTTP ${response.status}). ` +
                responseText.slice(0, 200)
            );
        }

        const data = await response.json();

        console.log("HTTP Status:", response.status);
        console.log("Server response:", data);

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        const result = String(data.prediction || "Unknown").toUpperCase();
        const score = Number(data.confidence);

        if (!["REAL", "FAKE"].includes(result)) {
            throw new Error("The backend did not return a valid REAL/FAKE prediction.");
        }

        if (!Number.isFinite(score)) {
            throw new Error("The backend did not return a valid confidence score.");
        }

        prediction.textContent = result;
        confidence.textContent = score.toFixed(2) + "%";

        confidenceBar.style.width =
            Math.min(100, Math.max(0, score)) + "%";

        if (result === "REAL") {
            message.textContent =
                "This voice appears to be genuine according to the trained model.";
            resultCard.classList.remove("fake");
        } else {
            message.textContent =
                "This recording shows characteristics associated with AI-generated or cloned speech.";
            resultCard.classList.add("fake");
        }

        loading.style.display = "none";
        resultCard.style.display = "block";

        console.log("Prediction:", result);
        console.log("Confidence:", score);
        console.log("========== RESULT DISPLAYED ==========");
    } catch (error) {
        console.error("Analysis error:", error);

        loading.style.display = "none";

        alert(
            "Unable to analyze the audio.\n\n" +
            error.message +
            "\n\nCheck your internet connection and backend service."
        );
    } finally {
        analyzeBtn.disabled = false;
    }
});

// ==========================================
// RESET
// ==========================================

resetBtn.addEventListener("click", () => {
    resultCard.style.display = "none";
    loading.style.display = "none";

    audioFile.value = "";
    fileName.textContent = "No file selected";

    recordedBlob = null;
    recordedFile = null;
    audioChunks = [];

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }

    audioPreview.pause();
    audioPreview.removeAttribute("src");
    audioPreview.load();
    audioPreview.style.display = "none";

    recordStatus.textContent = "Ready to record";
    recordBtn.textContent = "Start Recording";
    recordIcon.textContent = "🎙";
    timer.textContent = "00:00";

    prediction.textContent = "Result";
    confidence.textContent = "0%";
    confidenceBar.style.width = "0%";
    message.textContent = "";

    resultCard.classList.remove("fake");

    stopTimer();
    stopRecordingIfNeeded();

    console.log("VoxShield reset.");
});
