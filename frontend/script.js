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

    if (
        audioFile.files &&
        audioFile.files.length > 0
    ) {

        const file = audioFile.files[0];

        fileName.textContent = file.name;

        console.log("Selected file:", file.name);
        console.log("File type:", file.type);
        console.log("File size:", file.size);

    } else {

        fileName.textContent =
            "No file selected";
    }
});


// ==========================================
// RECORD BUTTON
// ==========================================

recordBtn.addEventListener("click", async () => {

    if (
        !mediaRecorder ||
        mediaRecorder.state === "inactive"
    ) {

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

        console.log("Requesting microphone...");

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
        // SELECT RECORDING FORMAT
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
        // CREATE RECORDER
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
        // AUDIO DATA
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
        // RECORDING STOPPED
        // ----------------------------------

        mediaRecorder.onstop = () => {

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
        // START RECORDING
        // ----------------------------------

        mediaRecorder.start(250);


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
        setInterval(() => {

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

        }, 1000);
}


function stopTimer() {

    clearInterval(
        recordingTimer
    );

    recordingTimer = null;
}


// ==========================================
// ANALYZE AUDIO
// ==========================================

analyzeBtn.addEventListener(
    "click",
    async () => {

        console.log(
            "================================="
        );

        console.log(
            "ANALYZE STARTED"
        );

        console.log(
            "================================="
        );


        let audioToAnalyze = null;


        // ==================================
        // UPLOAD MODE
        // ==================================

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


        // ==================================
        // RECORD MODE
        // ==================================

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


        // ==================================
        // FORM DATA
        // ==================================

        const formData =
            new FormData();


        formData.append(
            "audio",
            audioToAnalyze
        );


        // ==================================
        // UI
        // ==================================

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


            // ==================================
            // SEND TO BACKEND
            // ==================================

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


            // ==================================
            // READ RESPONSE
            // ==================================

            const data =
                await response.json();


            console.log(
                "================================="
            );

            console.log(
                "FULL SERVER RESPONSE:"
            );

            console.log(
                data
            );

            console.log(
                "AUDIO DATA:"
            );

            console.log(
                data.audio
            );

            console.log(
                "================================="
            );


            // ==================================
            // SERVER ERROR
            // ==================================

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Server error"
                );
            }


            // ==================================
            // PREDICTION
            // ==================================

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


            // ==================================
            // RESULT MESSAGE
            // ==================================

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


            // ==================================
            // AUDIO DASHBOARD
            // ==================================

            updateAudioDashboard(data);


            // ==================================
            // SHOW RESULT
            // ==================================

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
// UPDATE AUDIO DASHBOARD
// ==========================================

function updateAudioDashboard(data) {

    console.log(
        "Updating audio dashboard..."
    );


    const audio =
        data.audio;


    // ======================================
    // CHECK AUDIO DATA
    // ======================================

    if (!audio) {

        console.warn(
            "Backend did not return audio dashboard data."
        );

        return;
    }


    console.log(
        "Dashboard audio data:",
        audio
    );


    // ======================================
    // CONFIDENCE
    // ======================================

    const modelConfidence =
        Number(
            data.confidence
        ) || 0;


    setText(
        "confidenceValue",
        modelConfidence.toFixed(2) + "%"
    );


    setWidth(
        "confidenceBar",
        modelConfidence
    );


    // ======================================
    // PITCH
    // ======================================

    const pitch =
        Number(
            audio.pitch_hz
        ) || 0;


    const pitchLevel =
        Number(
            audio.pitch_level
        ) || 0;


    setText(
        "pitchValue",
        pitch.toFixed(2) + " Hz"
    );


    setText(
        "pitchLevel",
        pitchLevel.toFixed(2) + "%"
    );


    setWidth(
        "pitchBar",
        pitchLevel
    );


    // ======================================
    // FREQUENCY
    // ======================================

    const frequency =
        Number(
            audio.frequency_hz
        ) || 0;


    const frequencyLevel =
        Number(
            audio.frequency_level
        ) || 0;


    setText(
        "frequencyValue",
        frequency.toFixed(2) + " Hz"
    );


    setText(
        "frequencyLevel",
        frequencyLevel.toFixed(2) + "%"
    );


    setWidth(
        "frequencyBar",
        frequencyLevel
    );


    // ======================================
    // SPECTRAL CENTROID
    // ======================================

    const centroid =
        Number(
            audio.spectral_centroid_hz
        ) || 0;


    const centroidLevel =
        Number(
            audio.centroid_level
        ) || 0;


    setText(
        "centroidValue",
        centroid.toFixed(2) + " Hz"
    );


    setText(
        "centroidLevel",
        centroidLevel.toFixed(2) + "%"
    );


    setWidth(
        "centroidBar",
        centroidLevel
    );


    // ======================================
    // SPECTRAL BANDWIDTH
    // ======================================

    const bandwidth =
        Number(
            audio.spectral_bandwidth_hz
        ) || 0;


    const bandwidthLevel =
        Number(
            audio.bandwidth_level
        ) || 0;


    setText(
        "bandwidthValue",
        bandwidth.toFixed(2) + " Hz"
    );


    setText(
        "bandwidthLevel",
        bandwidthLevel.toFixed(2) + "%"
    );


    setWidth(
        "bandwidthBar",
        bandwidthLevel
    );


    // ======================================
    // AUDIO ENERGY
    // ======================================

    const rms =
        Number(
            audio.rms_energy
        ) || 0;


    const rmsLevel =
        Number(
            audio.rms_level
        ) || 0;


    setText(
        "rmsValue",
        rms.toFixed(5)
    );


    setText(
        "rmsLevel",
        rmsLevel.toFixed(2) + "%"
    );


    setWidth(
        "rmsBar",
        rmsLevel
    );


    // ======================================
    // DURATION
    // ======================================

    const duration =
        Number(
            audio.duration_seconds
        ) || 0;


    setText(
        "durationValue",
        duration.toFixed(2) +
        " seconds"
    );


    // ======================================
    // SAMPLE RATE
    // ======================================

    if (
        audio.sample_rate !== undefined
    ) {

        setText(
            "sampleRateValue",
            audio.sample_rate +
            " Hz"
        );
    }


    // ======================================
    // WAVEFORM
    // ======================================

    if (
        audio.waveform &&
        audio.waveform.length > 0
    ) {

        drawWaveform(
            audio.waveform
        );

    } else {

        console.warn(
            "No waveform data received."
        );
    }


    console.log(
        "Audio dashboard updated successfully."
    );
}


// ==========================================
// SAFE TEXT UPDATE
// ==========================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        console.warn(
            "Element not found:",
            elementId
        );

        return;
    }


    element.textContent =
        value;
}


// ==========================================
// SAFE PROGRESS BAR UPDATE
// ==========================================

function setWidth(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        console.warn(
            "Progress bar not found:",
            elementId
        );

        return;
    }


    const safeValue =
        Math.min(
            100,
            Math.max(
                0,
                Number(value) || 0
            )
        );


    element.style.width =
        safeValue + "%";
}


// ==========================================
// DRAW WAVEFORM
// ==========================================

function drawWaveform(
    waveform
) {

    const canvas =
        document.getElementById(
            "waveformCanvas"
        );


    if (
        !canvas ||
        !waveform ||
        waveform.length === 0
    ) {

        console.warn(
            "Waveform canvas or data missing."
        );

        return;
    }


    const ctx =
        canvas.getContext("2d");


    const width =
        canvas.width;


    const height =
        canvas.height;


    // Clear canvas

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    // ======================================
    // CENTER LINE
    // ======================================

    ctx.beginPath();

    ctx.moveTo(
        0,
        height / 2
    );

    ctx.lineTo(
        width,
        height / 2
    );

    ctx.stroke();


    // ======================================
    // WAVEFORM
    // ======================================

    ctx.beginPath();


    const step =
        width / waveform.length;


    for (
        let i = 0;
        i < waveform.length;
        i++
    ) {

        const x =
            i * step;


        const y =
            (height / 2) -
            (
                waveform[i] *
                (height / 2) *
                0.9
            );


        if (i === 0) {

            ctx.moveTo(
                x,
                y
            );

        } else {

            ctx.lineTo(
                x,
                y
            );
        }
    }


    ctx.stroke();


    console.log(
        "Waveform displayed."
    );
}


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


        audioFile.value =
            "";


        fileName.textContent =
            "No file selected";


        recordedBlob =
            null;


        recordedFile =
            null;


        audioChunks =
            [];


        audioPreview.src =
            "";


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


        // ==================================
        // RESET DASHBOARD
        // ==================================

        setText(
            "confidenceValue",
            "0%"
        );

        setWidth(
            "confidenceBar",
            0
        );


        setText(
            "pitchValue",
            "0 Hz"
        );

        setText(
            "pitchLevel",
            "0%"
        );

        setWidth(
            "pitchBar",
            0
        );


        setText(
            "frequencyValue",
            "0 Hz"
        );

        setText(
            "frequencyLevel",
            "0%"
        );

        setWidth(
            "frequencyBar",
            0
        );


        setText(
            "centroidValue",
            "0 Hz"
        );

        setText(
            "centroidLevel",
            "0%"
        );

        setWidth(
            "centroidBar",
            0
        );


        setText(
            "bandwidthValue",
            "0 Hz"
        );

        setText(
            "bandwidthLevel",
            "0%"
        );

        setWidth(
            "bandwidthBar",
            0
        );


        setText(
            "rmsValue",
            "0"
        );

        setText(
            "rmsLevel",
            "0%"
        );

        setWidth(
            "rmsBar",
            0
        );


        setText(
            "durationValue",
            "0 seconds"
        );


        setText(
            "sampleRateValue",
            "0 Hz"
        );


        // ==================================
        // CLEAR WAVEFORM
        // ==================================

        const canvas =
            document.getElementById(
                "waveformCanvas"
            );


        if (canvas) {

            const ctx =
                canvas.getContext("2d");

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
        }


        console.log(
            "Reset completed."
        );
    }
);