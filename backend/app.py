from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
import uuid
import numpy as np
import pandas as pd
import librosa
import joblib

# ===============================
# FLASK SETUP
# ===============================

app = Flask(__name__)
CORS(app)

# ===============================
# PROJECT PATHS
# ===============================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ===============================
# LOAD MODEL
# ===============================

print("Loading VoxShield model...")

model = joblib.load(MODEL_FILE)

print("Model loaded successfully.")

# ===============================
# CONVERT AUDIO TO STANDARD WAV
# ===============================

def convert_to_wav(input_file, output_file):

    command = [
        "ffmpeg",
        "-y",
        "-i",
        input_file,

        # Standard format used by the ML pipeline
        "-ar",
        "16000",

        # Mono
        "-ac",
        "1",

        # PCM WAV
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
            "Audio conversion failed: " + result.stderr[-1000:]
        )


# ===============================
# FEATURE EXTRACTION
# ===============================

def extract_features(file_path):

    audio, sample_rate = librosa.load(
        file_path,
        sr=16000,
        mono=True
    )

    if len(audio) == 0:
        raise ValueError("The audio file contains no usable audio.")

    # -------------------------------
    # MFCC
    # -------------------------------

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sample_rate,
        n_mfcc=13
    )

    mfcc_mean = np.mean(
        mfcc,
        axis=1
    )

    # -------------------------------
    # MEL SPECTROGRAM
    # -------------------------------

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

    # -------------------------------
    # COMBINE
    # -------------------------------

    features = np.concatenate(
        [
            mfcc_mean,
            mel_mean
        ]
    )

    return features


# ===============================
# HOME
# ===============================

@app.route("/")
def home():

    return "VoxShield API is running!"


# ===============================
# HEALTH CHECK
# ===============================

@app.route("/health")
def health():

    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None
    })


# ===============================
# PREDICTION
# ===============================

@app.route("/predict", methods=["POST"])
def predict():

    if "audio" not in request.files:

        return jsonify({
            "error": "No audio file uploaded."
        }), 400

    audio_file = request.files["audio"]

    if not audio_file.filename:

        return jsonify({
            "error": "No audio filename received."
        }), 400

    # -------------------------------
    # Unique filenames
    # -------------------------------

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

        print("\n==============================")
        print("NEW AUDIO REQUEST")
        print("==============================")

        print(
            "FILE RECEIVED:",
            original_name
        )

        # -------------------------------
        # Save original
        # -------------------------------

        audio_file.save(
            original_path
        )

        print(
            "FILE SAVED:",
            original_path
        )

        # -------------------------------
        # Convert ANY supported audio
        # to standard WAV
        # -------------------------------

        convert_to_wav(
            original_path,
            wav_path
        )

        print(
            "AUDIO CONVERSION COMPLETED"
        )

        # -------------------------------
        # Extract features
        # -------------------------------

        features = extract_features(
            wav_path
        )

        print(
            "FEATURE COUNT:",
            len(features)
        )

        # Expected:
        # 13 MFCC + 128 MEL = 141

        if len(features) != 141:

            raise ValueError(
                f"Expected 141 features, got {len(features)}"
            )

        # -------------------------------
        # Feature DataFrame
        # -------------------------------

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

        feature_df = pd.DataFrame(
            [features],
            columns=columns
        )

        # -------------------------------
        # Prediction
        # -------------------------------

        prediction = model.predict(
            feature_df
        )[0]

        probabilities = model.predict_proba(
            feature_df
        )[0]

        # -------------------------------
        # Result
        # -------------------------------

        if int(prediction) == 0:

            result = "REAL"

            confidence = (
                float(probabilities[0]) * 100
            )

        else:

            result = "AI-GENERATED / FAKE"

            confidence = (
                float(probabilities[1]) * 100
            )

        print(
            "PREDICTION:",
            result
        )

        print(
            "CONFIDENCE:",
            round(confidence, 2)
        )

        print("==============================\n")

        return jsonify({

            "prediction": result,

            "confidence": round(
                confidence,
                2
            ),

            "features": 141,

            "sample_rate": 16000,

            "channels": 1

        })

    except Exception as e:

        print(
            "ERROR:",
            str(e)
        )

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        # Delete uploaded file

        if os.path.exists(
            original_path
        ):

            try:
                os.remove(
                    original_path
                )
            except:
                pass

        # Delete converted file

        if os.path.exists(
            wav_path
        ):

            try:
                os.remove(
                    wav_path
                )
            except:
                pass


# ===============================
# START SERVER
# ===============================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )