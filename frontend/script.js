// ===============================
// ELEMENTS
// ===============================

const audioFile = document.getElementById("audioFile");
const fileName = document.getElementById("fileName");

const analyzeBtn = document.getElementById("analyzeBtn");

const uploadMode = document.getElementById("uploadMode");
const recordMode = document.getElementById("recordMode");

const uploadPanel = document.getElementById("uploadPanel");
const recordPanel = document.getElementById("recordPanel");

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

const resultIcon = document.getElementById("resultIcon");
const resetBtn = document.getElementById("resetBtn");

const waveformContainer = document.getElementById("waveformContainer");
const waveformStatus = document.getElementById("waveformStatus");


// ===============================
// CHECK REQUIRED ELEMENTS
// ===============================

console.log("VoxShield script loaded.");

if (!loading) {
    console.error("ERROR: #loading element not found in HTML.");
}

if (!analyzeBtn) {
    console.error("ERROR: #analyzeBtn element not found in HTML.");
}


// ===============================
// VARIABLES
// ===============================

let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;

let recordingTimer = null;
let recordingSeconds = 0;

let currentMode = "upload";


// ===============================
// INITIAL STATE
// ===============================

if (loading) {
    loading.style.display = "none";
}

if (resultCard) {
    resultCard.style.display = "none";
}

if (waveformContainer) {
    waveformContainer.style.display = "none";
}


// ===============================
// UPLOAD MODE
// ===============================

if (uploadMode) {
    uploadMode.addEventListener("click", function () {

        currentMode = "upload";

        uploadMode.classList.add("active");
        recordMode.classList.remove("active");

        uploadPanel.style.display = "block";
        recordPanel.style.display = "none";

    });
}


// ===============================
// RECORD MODE
// ===============================

if (recordMode) {
    recordMode.addEventListener("click", function () {

        currentMode = "record";

        recordMode.classList.add("active");
        uploadMode.classList.remove("active");

        uploadPanel.style.display = "none";
        recordPanel.style.display = "block";

    });
}


// ===============================
// FILE SELECTION
// ===============================

if (audioFile) {

    audioFile.addEventListener("change", function () {

        if (audioFile.files.length > 0) {

            const selectedFile = audioFile.files[0];

            if (fileName) {
                fileName.innerText = selectedFile.name;
            }

            console.log("Selected file:", selectedFile.name);

            if (waveformContainer) {
                waveformContainer.style.display = "block";

                if (waveformStatus) {
                    waveformStatus.innerText = "Audio selected";
                }
            }

        } else {

            if (fileName) {
                fileName.innerText = "No file selected";
            }

            if (waveformContainer) {
                waveformContainer.style.display = "none";
            }

        }

    });

}


// ===============================
// RECORDING
// ===============================

if (recordBtn) {

    recordBtn.addEventListener("click", async function () {

        // START RECORDING
        if (!mediaRecorder || mediaRecorder.state === "inactive") {

            try {

                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        audio: true
                    });

                audioChunks = [];

                mediaRecorder =
                    new MediaRecorder(stream);

                mediaRecorder.ondataavailable =
                    function (event) {

                        if (event.data.size > 0) {
                            audioChunks.push(event.data);
                        }

                    };


                mediaRecorder.onstop =
                    function () {

                        recordedBlob =
                            new Blob(
                                audioChunks,
                                {
                                    type: "audio/webm"
                                }
                            );

                        const audioURL =
                            URL.createObjectURL(
                                recordedBlob
                            );

                        if (audioPreview) {
                            audioPreview.src = audioURL;
                            audioPreview.style.display = "block";
                        }

                        if (recordStatus) {
                            recordStatus.innerText =
                                "Recording ready for analysis";
                        }

                        if (recordIcon) {
                            recordIcon.classList.remove(
                                "recording"
                            );
                        }

                        if (waveformContainer) {
                            waveformContainer.style.display =
                                "block";

                            if (waveformStatus) {
                                waveformStatus.innerText =
                                    "Recording captured";
                            }
                        }

                    };


                mediaRecorder.start();

                recordBtn.innerHTML =
                    "<span>■</span> Stop Recording";

                if (recordStatus) {
                    recordStatus.innerText =
                        "Recording... Speak clearly";
                }

                if (recordIcon) {
                    recordIcon.classList.add("recording");
                }

                startTimer();

            }

            catch (error) {

                console.error(
                    "Microphone error:",
                    error
                );

                alert(
                    "Microphone access is required to record your voice."
                );

            }

        }

        // STOP RECORDING
        else {

            mediaRecorder.stop();

            mediaRecorder.stream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            recordBtn.innerHTML =
                "<span>●</span> Start Recording";

            stopTimer();

        }

    });

}


// ===============================
// TIMER
// ===============================

function startTimer() {

    recordingSeconds = 0;

    if (timer) {
        timer.innerText = "00:00";
    }

    recordingTimer =
        setInterval(function () {

            recordingSeconds++;

            const minutes =
                Math.floor(
                    recordingSeconds / 60
                );

            const seconds =
                recordingSeconds % 60;

            if (timer) {

                timer.innerText =
                    String(minutes).padStart(2, "0")
                    + ":" +
                    String(seconds).padStart(2, "0");

            }

        }, 1000);

}


function stopTimer() {

    clearInterval(recordingTimer);

}


// ===============================
// ANALYZE VOICE
// ===============================

if (analyzeBtn) {

    analyzeBtn.addEventListener(
        "click",
        async function () {

            console.log(
                "========== ANALYZE STARTED =========="
            );


            let audioToAnalyze = null;


            // -------------------------------
            // UPLOAD MODE
            // -------------------------------

            if (currentMode === "upload") {

                if (
                    !audioFile ||
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


            // -------------------------------
            // RECORD MODE
            // -------------------------------

            else {

                if (!recordedBlob) {

                    alert(
                        "Please record your voice first."
                    );

                    return;
                }

                audioToAnalyze =
                    new File(
                        [recordedBlob],
                        "voxshield_recording.webm",
                        {
                            type: "audio/webm"
                        }
                    );

            }


            console.log(
                "Audio:",
                audioToAnalyze.name
            );


            // -------------------------------
            // CREATE FORM DATA
            // -------------------------------

            const formData =
                new FormData();

            formData.append(
                "audio",
                audioToAnalyze
            );


            // -------------------------------
            // SHOW LOADING
            // -------------------------------

            if (loading) {
                loading.style.display = "flex";
            }

            if (resultCard) {
                resultCard.style.display = "none";
            }

            analyzeBtn.disabled = true;


            // -------------------------------
            // SEND TO FLASK BACKEND
            // -------------------------------

            try {

                console.log(
                    "Sending audio to Flask..."
                );


                const response =
                    await fetch(
                        "https://voxshield-wbra.onrender.com/predict",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                console.log(
                    "HTTP Status:",
                    response.status
                );


                if (!response.ok) {

                    throw new Error(
                        "Server responded with status "
                        + response.status
                    );

                }


                // -------------------------------
                // READ SERVER RESPONSE
                // -------------------------------

                const data =
                    await response.json();


                console.log(
                    "Server response:",
                    data
                );


                // -------------------------------
                // CHECK BACKEND ERROR
                // -------------------------------

                if (data.error) {

                    throw new Error(
                        data.error
                    );

                }


                // -------------------------------
                // GET RESULT
                // -------------------------------

                const result =
                    data.prediction ??
                    "Unknown";

                const score =
                    Number(
                        data.confidence ?? 0
                    );


                console.log(
                    "Prediction:",
                    result
                );

                console.log(
                    "Confidence:",
                    score
                );


                // -------------------------------
                // DISPLAY PREDICTION
                // -------------------------------

                if (prediction) {

                    prediction.innerText =
                        result;

                }


                // -------------------------------
                // DISPLAY CONFIDENCE
                // -------------------------------

                if (confidence) {

                    confidence.innerText =
                        score.toFixed(2) + "%";

                }


                // -------------------------------
                // CONFIDENCE BAR
                // -------------------------------

                if (confidenceBar) {

                    confidenceBar.style.width =
                        score + "%";

                }


                // -------------------------------
                // RESULT MESSAGE
                // -------------------------------

                if (message) {

                    if (result === "REAL") {

                        message.innerText =
                            "This voice appears to be genuine.";

                    }

                    else {

                        message.innerText =
                            "This voice may be AI-generated or cloned.";

                    }

                }


                // -------------------------------
                // RESULT ICON
                // -------------------------------

                if (resultIcon) {

                    if (result === "REAL") {

                        resultIcon.innerText = "🛡";

                    }

                    else {

                        resultIcon.innerText = "⚠️";

                    }

                }


                // -------------------------------
                // SHOW RESULT CARD
                // -------------------------------

                if (resultCard) {

                    resultCard.style.display =
                        "block";

                }


                console.log(
                    "========== RESULT DISPLAYED =========="
                );

            }


            // -------------------------------
            // ERROR HANDLING
            // -------------------------------

            catch (error) {

                console.error(
                    "ANALYZE ERROR:",
                    error
                );

                alert(
                    "Something went wrong while analyzing the audio.\n\n"
                    + error.message
                );

            }


            // -------------------------------
            // FINISH
            // -------------------------------

            finally {

                if (loading) {
                    loading.style.display = "none";
                }

                analyzeBtn.disabled = false;

            }

        }
    );

}


// ===============================
// RESET BUTTON
// ===============================

if (resetBtn) {

    resetBtn.addEventListener(
        "click",
        function () {

            // Clear uploaded file
            if (audioFile) {
                audioFile.value = "";
            }

            // Reset filename
            if (fileName) {
                fileName.innerText =
                    "No file selected";
            }

            // Reset recording
            recordedBlob = null;
            audioChunks = [];

            // Reset audio preview
            if (audioPreview) {

                audioPreview.pause();
                audioPreview.src = "";
                audioPreview.style.display = "none";

            }

            // Reset result
            if (prediction) {
                prediction.innerText = "Result";
            }

            if (confidence) {
                confidence.innerText = "0%";
            }

            if (confidenceBar) {
                confidenceBar.style.width = "0%";
            }

            if (message) {
                message.innerText =
                    "Analysis result will appear here.";
            }

            if (resultIcon) {
                resultIcon.innerText = "🛡";
            }

            // Hide result
            if (resultCard) {
                resultCard.style.display = "none";
            }

            // Hide waveform
            if (waveformContainer) {
                waveformContainer.style.display = "none";
            }

            if (waveformStatus) {
                waveformStatus.innerText = "Ready";
            }

            console.log(
                "VoxShield reset."
            );

        }
    );

}