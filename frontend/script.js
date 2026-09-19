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

const API_URL =
    "https://voxshield-wbra.onrender.com/predict";


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


// ==========================================
// UPLOAD MODE
// ==========================================

uploadMode.addEventListener(
    "click",
    () => {

        currentMode = "upload";

        uploadMode.classList.add("active");
        recordMode.classList.remove("active");

        uploadPanel.style.display = "block";
        recordPanel.style.display = "none";

        stopRecordingIfNeeded();
    }
);


// ==========================================
// RECORD MODE
// ==========================================

recordMode.addEventListener(
    "click",
    () => {

        currentMode = "record";

        recordMode.classList.add("active");
        uploadMode.classList.remove("active");

        uploadPanel.style.display = "none";
        recordPanel.style.display = "block";
    }
);


// ==========================================
// FILE SELECTION
// ==========================================

audioFile.addEventListener(
    "change",
    () => {

        if (
            audioFile.files &&
            audioFile.files.length > 0
        ) {

            const file =
                audioFile.files[0];

            fileName.textContent =
                file.name;

            console.log(
                "Selected file:",
                file.name
            );

            console.log(
                "File type:",
                file.type
            );

            console.log(
                "File size:",
                file.size
            );

        } else {

            fileName.textContent =
                "No file selected";
        }
    }
);


// ==========================================
// RECORDING
// ==========================================

recordBtn.addEventListener(
    "click",
    async () => {

        if (!mediaRecorder ||
            mediaRecorder.state === "inactive") {

            await startRecording();

        } else {

            stopRecording();
        }
    }
);


// ==========================================
// START RECORDING
// ==========================================

async function startRecording() {

    try {

        console.log(
            "Requesting microphone..."
        );

        recordingStream =
            await navigator.mediaDevices.getUserMedia({
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

        // ----------------------------------
        // Select supported browser format
        // ----------------------------------

        let mimeType = "";

        if (
            MediaRecorder.isTypeSupported(
                "audio/webm;codecs=opus"
            )
        ) {

            mimeType =
                "audio/webm;codecs=opus";

        } else if (
            MediaRecorder.isTypeSupported(
                "audio/webm"
            )
        ) {

            mimeType =
                "audio/webm";

        } else if (
            MediaRecorder.isTypeSupported(
                "audio/ogg"
            )
        ) {

            mimeType =
                "audio/ogg";
        }

        console.log(
            "Recording format:",
            mimeType || "browser default"
        );

        // ----------------------------------
        // Create recorder
        // ----------------------------------

        if (mimeType) {

            mediaRecorder =
                new MediaRecorder(
                    recordingStream,
                    {
                        mimeType: mimeType
                    }
                );

        } else {

            mediaRecorder =
                new MediaRecorder(
                    recordingStream
                );
        }

        // ----------------------------------
        // Receive audio data
        // ----------------------------------

        mediaRecorder.ondataavailable =
            (event) => {

                if (
                    event.data &&
                    event.data.size > 0
                ) {

                    audioChunks.push(
                        event.data
                    );
                }
            };

        // ----------------------------------
        // Recording finished
        // ----------------------------------

        mediaRecorder.onstop =
            () => {

                const actualType =
                    mediaRecorder.mimeType ||
                    "audio/webm";

                recordedBlob =
                    new Blob(
                        audioChunks,
                        {
                            type: actualType
                        }
                    );

                recordedFile =
                    new File(
                        [recordedBlob],
                        "voxshield_recording.webm",
                        {
                            type: actualType
                        }
                    );

                const audioURL =
                    URL.createObjectURL(
                        recordedBlob
                    );

                audioPreview.src =
                    audioURL;

                audioPreview.style.display =
                    "block";

                recordStatus.textContent =
                    "Recording ready for analysis";

                recordBtn.innerHTML =
                    "<span>●</span> Start Recording";

                recordIcon.textContent =
                    "🎙";

                stopTimer();

                if (recordingStream) {

                    recordingStream
                        .getTracks()
                        .forEach(
                            track => track.stop()
                        );

                    recordingStream = null;
                }

                console.log(
                    "Recording completed."
                );

                console.log(
                    "Recorded size:",
                    recordedBlob.size
                );

                console.log(
                    "Recorded type:",
                    recordedBlob.type
                );
            };

        // ----------------------------------
        // Start
        // ----------------------------------

        mediaRecorder.start(
            250
        );

        recordStatus.textContent =
            "Recording... Speak clearly";

        recordBtn.innerHTML =
            "<span>■</span> Stop Recording";

        recordIcon.textContent =
            "🔴";

        startTimer();

        console.log(
            "Recording started."
        );

    } catch (error) {

        console.error(
            "Microphone error:",
            error
        );

        alert(
            "Microphone access was not allowed. Please allow microphone permission and try again."
        );
    }
}


// ==========================================
// STOP RECORDING
// ==========================================

function stopRecording() {

    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {

        mediaRecorder.stop();

        console.log(
            "Stopping recording..."
        );
    }
}


// ==========================================
// STOP RECORDING IF NEEDED
// ==========================================

function stopRecordingIfNeeded() {

    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {

        mediaRecorder.stop();
    }
}


// ==========================================
// TIMER
// ==========================================

function startTimer() {

    recordingSeconds = 0;

    timer.textContent =
        "00:00";

    clearInterval(
        recordingTimer
    );

    recordingTimer =
        setInterval(
            () => {

                recordingSeconds++;

                const minutes =
                    Math.floor(
                        recordingSeconds / 60
                    );

                const seconds =
                    recordingSeconds % 60;

                timer.textContent =
                    String(minutes)
                        .padStart(2, "0")
                    +
                    ":"
                    +
                    String(seconds)
                        .padStart(2, "0");

            },
            1000
        );
}


function stopTimer() {

    clearInterval(
        recordingTimer
    );

    recordingTimer = null;
}


// ==========================================
// ANALYZE
// ==========================================

analyzeBtn.addEventListener(
    "click",
    async () => {

        console.log(
            "ANALYZE STARTED"
        );

        let audioToAnalyze = null;

        // ----------------------------------
        // UPLOAD
        // ----------------------------------

        if (
            currentMode === "upload"
        ) {

            if (
                !audioFile.files ||
                audioFile.files.length === 0
            ) {

                alert(
                    "Please select an audio file first."
                );

                return;
            }

            audioToAnalyze =
                audioFile.files[0];
        }

        // ----------------------------------
        // RECORDING
        // ----------------------------------

        else {

            if (!recordedBlob) {

                alert(
                    "Please record your voice first."
                );

                return;
            }

            audioToAnalyze =
                recordedFile ||
                new File(
                    [recordedBlob],
                    "voxshield_recording.webm",
                    {
                        type:
                            recordedBlob.type
                    }
                );
        }

        console.log(
            "Audio file:",
            audioToAnalyze.name
        );

        console.log(
            "Audio type:",
            audioToAnalyze.type
        );

        console.log(
            "Audio size:",
            audioToAnalyze.size
        );


        // ----------------------------------
        // FORM DATA
        // ----------------------------------

        const formData =
            new FormData();

        formData.append(
            "audio",
            audioToAnalyze
        );


        // ----------------------------------
        // UI
        // ----------------------------------

        analyzeBtn.disabled =
            true;

        resultCard.style.display =
            "none";

        loading.style.display =
            "block";


        try {

            console.log(
                "Sending audio to Flask..."
            );

            // ----------------------------------
            // SEND TO BACKEND
            // ----------------------------------

            const response =
                await fetch(
                    API_URL,
                    {
                        method: "POST",
                        body: formData
                    }
                );

            console.log(
                "HTTP Status:",
                response.status
            );

            const data =
                await response.json();
                /* =========================================
   AUDIO ANALYSIS DASHBOARD
========================================= */

const audio = data.audio;

if (audio) {

    /* =========================
       MODEL CONFIDENCE
    ========================= */

    const confidence = Number(data.confidence) || 0;

    document.getElementById("confidenceValue").textContent =
        confidence.toFixed(2) + "%";

    document.getElementById("confidenceBar").style.width =
        Math.min(confidence, 100) + "%";


    /* =========================
       PITCH
    ========================= */

    const pitch = Number(audio.pitch_hz) || 0;
    const pitchLevel = Number(audio.pitch_level) || 0;

    document.getElementById("pitchValue").textContent =
        pitch.toFixed(2) + " Hz";

    document.getElementById("pitchLevel").textContent =
        pitchLevel.toFixed(2) + "%";

    document.getElementById("pitchBar").style.width =
        Math.min(pitchLevel, 100) + "%";


    /* =========================
       FREQUENCY
    ========================= */

    const frequency = Number(audio.frequency_hz) || 0;
    const frequencyLevel = Number(audio.frequency_level) || 0;

    document.getElementById("frequencyValue").textContent =
        frequency.toFixed(2) + " Hz";

    document.getElementById("frequencyLevel").textContent =
        frequencyLevel.toFixed(2) + "%";

    document.getElementById("frequencyBar").style.width =
        Math.min(frequencyLevel, 100) + "%";


    /* =========================
       SPECTRAL CENTROID
    ========================= */

    const centroid =
        Number(audio.spectral_centroid_hz) || 0;

    const centroidLevel =
        Number(audio.centroid_level) || 0;

    document.getElementById("centroidValue").textContent =
        centroid.toFixed(2) + " Hz";

    document.getElementById("centroidLevel").textContent =
        centroidLevel.toFixed(2) + "%";

    document.getElementById("centroidBar").style.width =
        Math.min(centroidLevel, 100) + "%";


    /* =========================
       SPECTRAL BANDWIDTH
    ========================= */

    const bandwidth =
        Number(audio.spectral_bandwidth_hz) || 0;

    const bandwidthLevel =
        Number(audio.bandwidth_level) || 0;

    document.getElementById("bandwidthValue").textContent =
        bandwidth.toFixed(2) + " Hz";

    document.getElementById("bandwidthLevel").textContent =
        bandwidthLevel.toFixed(2) + "%";

    document.getElementById("bandwidthBar").style.width =
        Math.min(bandwidthLevel, 100) + "%";


    /* =========================
       AUDIO ENERGY
    ========================= */

    const rms =
        Number(audio.rms_energy) || 0;

    const rmsLevel =
        Number(audio.rms_level) || 0;

    document.getElementById("rmsValue").textContent =
        rms.toFixed(5);

    document.getElementById("rmsLevel").textContent =
        rmsLevel.toFixed(2) + "%";

    document.getElementById("rmsBar").style.width =
        Math.min(rmsLevel, 100) + "%";


    /* =========================
       DURATION
    ========================= */

    const duration =
        Number(audio.duration_seconds) || 0;

    document.getElementById("durationValue").textContent =
        duration.toFixed(2) + " seconds";


    /* =========================
       SAMPLE RATE
    ========================= */

    document.getElementById("sampleRateValue").textContent =
        audio.sample_rate + " Hz";


    /* =========================
       WAVEFORM
    ========================= */

    drawWaveform(audio.waveform);
}

            console.log(
                "Server response:",
                data
            );


            // ----------------------------------
            // ERROR
            // ----------------------------------

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Server error"
                );
            }


            // ----------------------------------
            // RESULT
            // ----------------------------------

            const result =
                data.prediction ||
                "Unknown";

            const score =
                Number(
                    data.confidence || 0
                );


            prediction.textContent =
                result;

            confidence.textContent =
                score.toFixed(2) +
                "%";

            confidenceBar.style.width =
                Math.min(
                    100,
                    Math.max(
                        0,
                        score
                    )
                ) +
                "%";


            // ----------------------------------
            // RESULT MESSAGE
            // ----------------------------------

            if (
                result === "REAL"
            ) {

                message.textContent =
                    "This voice appears to be genuine according to the trained model.";

                resultCard.classList.remove(
                    "fake"
                );

            } else {

                message.textContent =
                    "This recording shows characteristics associated with AI-generated or cloned speech.";

                resultCard.classList.add(
                    "fake"
                );
            }


            loading.style.display =
                "none";

            resultCard.style.display =
                "block";

            console.log(
                "Prediction:",
                result
            );

            console.log(
                "Confidence:",
                score
            );

            console.log(
                "RESULT DISPLAYED"
            );

        } catch (error) {

            console.error(
                "Analysis error:",
                error
            );

            loading.style.display =
                "none";

            alert(
                "Unable to analyze the audio.\n\n" +
                error.message
            );

        } finally {

            analyzeBtn.disabled =
                false;
        }
    }
);


// ==========================================
// RESET
// ==========================================

resetBtn.addEventListener(
    "click",
    () => {

        resultCard.style.display =
            "none";

        loading.style.display =
            "none";

        audioFile.value = "";

        fileName.textContent =
            "No file selected";

        recordedBlob = null;

        recordedFile = null;

        audioChunks = [];

        audioPreview.src = "";

        audioPreview.style.display =
            "none";

        recordStatus.textContent =
            "Ready to record";

        timer.textContent =
            "00:00";

        prediction.textContent =
            "Result";

        confidence.textContent =
            "0%";

        confidenceBar.style.width =
            "0%";

        console.log(
            "Reset completed."
        );
    }
);