from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
import uuid
import numpy as np
import pandas as pd
import librosa
import joblib


# ============================================================
# FLASK SETUP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_FILE = os.path.join(
    BASE_DIR,
    "backend",
    "model",
    "voice_detector.pkl"
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "backend",
    "uploads"
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ============================================================
# LOAD ML MODEL
# ============================================================

print("Loading VoxShield model...")

model = joblib.load(
    MODEL_FILE
)

print("Model loaded successfully.")


# ============================================================
# CONVERT AUDIO TO WAV
# ============================================================

def convert_to_wav(input_file, output_file):

    command = [
        "ffmpeg",
        "-y",
        "-i",
        input_file,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        output_file
    ]

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(
            "Audio conversion failed: "
            + result.stderr[-1000:]
        )


# ============================================================
# ML FEATURE EXTRACTION
# ============================================================
#
# IMPORTANT:
# Model expects exactly:
# 13 MFCC + 128 MEL = 141 features
#
# DO NOT CHANGE THIS FEATURE EXTRACTION.
# ============================================================

def extract_features(file_path):

    audio, sample_rate = librosa.load(
        file_path,
        sr=16000,
        mono=True
    )

    if len(audio) == 0:
        raise ValueError(
            "The audio file contains no usable audio."
        )

    # --------------------------------------------------------
    # MFCC
    # --------------------------------------------------------

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sample_rate,
        n_mfcc=13
    )

    mfcc_mean = np.mean(
        mfcc,
        axis=1
    )

    # --------------------------------------------------------
    # MEL SPECTROGRAM
    # --------------------------------------------------------

    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=sample_rate,
        n_mels=128
    )

    mel_db = librosa.power_to_db(
        mel,
        ref=np.max
    )

    mel_mean = np.mean(
        mel_db,
        axis=1
    )

    # --------------------------------------------------------
    # COMBINE
    # --------------------------------------------------------

    features = np.concatenate(
        [
            mfcc_mean,
            mel_mean
        ]
    )

    return features


# ============================================================
# DASHBOARD AUDIO ANALYSIS
# ============================================================

def extract_dashboard_features(file_path):

    # ========================================================
    # LOAD AUDIO
    # ========================================================

    audio, sample_rate = librosa.load(
        file_path,
        sr=16000,
        mono=True
    )

    if len(audio) == 0:
        raise ValueError(
            "The audio file contains no usable audio."
        )

    # ========================================================
    # DURATION
    # ========================================================

    duration_seconds = (
        len(audio) / sample_rate
    )

    # ========================================================
    # PITCH
    # ========================================================

    try:

        pitch = librosa.yin(
            audio,
            fmin=50,
            fmax=500,
            sr=sample_rate
        )

        valid_pitch = pitch[
            np.isfinite(pitch)
        ]

        if len(valid_pitch) > 0:

            pitch_hz = float(
                np.median(valid_pitch)
            )

        else:

            pitch_hz = 0.0

    except Exception:

        pitch_hz = 0.0

    # ========================================================
    # STFT
    # ========================================================

    S = np.abs(
        librosa.stft(
            audio,
            n_fft=2048,
            hop_length=512
        )
    )

    # ========================================================
    # DOMINANT FREQUENCY
    # ========================================================

    frequencies = librosa.fft_frequencies(
        sr=sample_rate,
        n_fft=2048
    )

    average_spectrum = np.mean(
        S,
        axis=1
    )

    frequency_mask = (
        (frequencies >= 50)
        &
        (frequencies <= 8000)
    )

    if np.any(frequency_mask):

        selected_frequencies = (
            frequencies[
                frequency_mask
            ]
        )

        selected_spectrum = (
            average_spectrum[
                frequency_mask
            ]
        )

        dominant_index = np.argmax(
            selected_spectrum
        )

        frequency_hz = float(
            selected_frequencies[
                dominant_index
            ]
        )

    else:

        frequency_hz = 0.0

    # ========================================================
    # SPECTRAL CENTROID
    # ========================================================

    centroid = (
        librosa.feature.spectral_centroid(
            S=S,
            sr=sample_rate
        )
    )

    centroid_hz = float(
        np.mean(centroid)
    )

    # ========================================================
    # SPECTRAL BANDWIDTH
    # ========================================================

    bandwidth = (
        librosa.feature.spectral_bandwidth(
            S=S,
            sr=sample_rate
        )
    )

    bandwidth_hz = float(
        np.mean(bandwidth)
    )

    # ========================================================
    # RMS ENERGY
    # ========================================================

    rms = librosa.feature.rms(
        y=audio
    )

    rms_energy = float(
        np.mean(rms)
    )

    # ========================================================
    # PERCENTAGE CALCULATION
    # ========================================================

    def calculate_level(
        value,
        minimum,
        maximum
    ):

        if maximum <= minimum:
            return 0.0

        percentage = (
            (value - minimum)
            /
            (maximum - minimum)
        ) * 100

        percentage = np.clip(
            percentage,
            0,
            100
        )

        return round(
            float(percentage),
            2
        )

    # ========================================================
    # FEATURE LEVELS
    # ========================================================

    pitch_level = calculate_level(
        pitch_hz,
        50,
        400
    )

    frequency_level = calculate_level(
        frequency_hz,
        50,
        8000
    )

    centroid_level = calculate_level(
        centroid_hz,
        0,
        8000
    )

    bandwidth_level = calculate_level(
        bandwidth_hz,
        0,
        8000
    )

    rms_level = calculate_level(
        rms_energy,
        0,
        0.1
    )

    # ========================================================
    # WAVEFORM
    # ========================================================

    maximum_points = 1000

    if len(audio) > maximum_points:

        indexes = np.linspace(
            0,
            len(audio) - 1,
            maximum_points
        ).astype(int)

        waveform = audio[
            indexes
        ]

    else:

        waveform = audio

    # --------------------------------------------------------
    # NORMALIZE WAVEFORM
    # --------------------------------------------------------

    maximum_amplitude = np.max(
        np.abs(waveform)
    )

    if maximum_amplitude > 0:

        waveform = (
            waveform
            /
            maximum_amplitude
        )

    waveform = waveform.astype(
        float
    ).tolist()

    # ========================================================
    # RETURN DASHBOARD DATA
    # ========================================================

    return {

        "pitch_hz": round(
            pitch_hz,
            2
        ),

        "pitch_level": pitch_level,

        "frequency_hz": round(
            frequency_hz,
            2
        ),

        "frequency_level": frequency_level,

        "spectral_centroid_hz": round(
            centroid_hz,
            2
        ),

        "centroid_level": centroid_level,

        "spectral_bandwidth_hz": round(
            bandwidth_hz,
            2
        ),

        "bandwidth_level": bandwidth_level,

        "rms_energy": round(
            rms_energy,
            5
        ),

        "rms_level": rms_level,

        "duration_seconds": round(
            duration_seconds,
            2
        ),

        "sample_rate": int(
            sample_rate
        ),

        "waveform": waveform
    }


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return "VoxShield API is running!"


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health")
def health():

    return jsonify({

        "status": "healthy",

        "model_loaded":
            model is not None

    })


# ============================================================
# PREDICTION
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    # ========================================================
    # CHECK AUDIO
    # ========================================================

    if "audio" not in request.files:

        return jsonify({

            "error":
                "No audio file uploaded."

        }), 400

    audio_file = request.files[
        "audio"
    ]

    if not audio_file.filename:

        return jsonify({

            "error":
                "No audio filename received."

        }), 400

    # ========================================================
    # UNIQUE FILE NAMES
    # ========================================================

    file_id = uuid.uuid4().hex

    original_name = os.path.basename(
        audio_file.filename
    )

    original_path = os.path.join(
        UPLOAD_FOLDER,
        f"{file_id}_{original_name}"
    )

    wav_path = os.path.join(
        UPLOAD_FOLDER,
        f"{file_id}_converted.wav"
    )

    try:

        print(
            "\n=============================="
        )

        print(
            "NEW AUDIO REQUEST"
        )

        print(
            "=============================="
        )

        print(
            "FILE RECEIVED:",
            original_name
        )

        # ====================================================
        # SAVE ORIGINAL FILE
        # ====================================================

        audio_file.save(
            original_path
        )

        print(
            "FILE SAVED:",
            original_path
        )

        # ====================================================
        # CONVERT AUDIO
        # ====================================================

        convert_to_wav(
            original_path,
            wav_path
        )

        print(
            "AUDIO CONVERSION COMPLETED"
        )

        # ====================================================
        # EXTRACT ML FEATURES
        # ====================================================

        features = extract_features(
            wav_path
        )

        print(
            "FEATURE COUNT:",
            len(features)
        )

        # ====================================================
        # CHECK FEATURE COUNT
        # ====================================================

        if len(features) != 141:

            raise ValueError(
                f"Expected 141 features, "
                f"got {len(features)}"
            )

        # ====================================================
        # FEATURE COLUMN NAMES
        # ====================================================

        columns = (

            [
                f"mfcc_{i + 1}"
                for i in range(13)
            ]

            +

            [
                f"mel_{i + 1}"
                for i in range(128)
            ]

        )

        # ====================================================
        # CREATE DATAFRAME
        # ====================================================

        feature_df = pd.DataFrame(
            [features],
            columns=columns
        )

        # ====================================================
        # ML PREDICTION
        # ====================================================

        prediction = model.predict(
            feature_df
        )[0]

        probabilities = (
            model.predict_proba(
                feature_df
            )[0]
        )

        # ====================================================
        # RESULT
        # ====================================================

        if int(prediction) == 0:

            result = "REAL"

            confidence = (
                float(probabilities[0])
                * 100
            )

        else:

            result = (
                "AI-GENERATED / FAKE"
            )

            confidence = (
                float(probabilities[1])
                * 100
            )

        # ====================================================
        # EXTRA AUDIO ANALYSIS
        # ====================================================

        dashboard_data = (
            extract_dashboard_features(
                wav_path
            )
        )

        # ====================================================
        # PRINT RESULTS
        # ====================================================

        print(
            "PREDICTION:",
            result
        )

        print(
            "CONFIDENCE:",
            round(
                confidence,
                2
            )
        )

        print(
            "PITCH:",
            dashboard_data[
                "pitch_hz"
            ],
            "Hz"
        )

        print(
            "FREQUENCY:",
            dashboard_data[
                "frequency_hz"
            ],
            "Hz"
        )

        print(
            "SPECTRAL CENTROID:",
            dashboard_data[
                "spectral_centroid_hz"
            ],
            "Hz"
        )

        print(
            "SPECTRAL BANDWIDTH:",
            dashboard_data[
                "spectral_bandwidth_hz"
            ],
            "Hz"
        )

        print(
            "RMS ENERGY:",
            dashboard_data[
                "rms_energy"
            ]
        )

        print(
            "DURATION:",
            dashboard_data[
                "duration_seconds"
            ],
            "seconds"
        )

        print(
            "SAMPLE RATE:",
            dashboard_data[
                "sample_rate"
            ],
            "Hz"
        )

        print(
            "WAVEFORM POINTS:",
            len(
                dashboard_data[
                    "waveform"
                ]
            )
        )

        print(
            "==============================\n"
        )

        # ====================================================
        # SEND RESULT TO FRONTEND
        # ====================================================

        return jsonify({

            "prediction":
                result,

            "confidence":
                round(
                    confidence,
                    2
                ),

            "features":
                141,

            "sample_rate":
                16000,

            "channels":
                1,

            "audio":
                dashboard_data

        })

    # ========================================================
    # ERROR HANDLING
    # ========================================================

    except Exception as e:

        print(
            "ERROR:",
            str(e)
        )

        return jsonify({

            "error":
                str(e)

        }), 500

    # ========================================================
    # DELETE TEMP FILES
    # ========================================================

    finally:

        if os.path.exists(
            original_path
        ):

            try:

                os.remove(
                    original_path
                )

            except Exception:

                pass

        if os.path.exists(
            wav_path
        ):

            try:

                os.remove(
                    wav_path
                )

            except Exception:

                pass


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )