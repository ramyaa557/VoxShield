from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
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

MODEL_FILE = os.path.join(BASE_DIR, "backend", "model", "voice_detector.pkl")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "backend", "uploads")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ===============================
# LOAD ML MODEL
# ===============================

model = joblib.load(MODEL_FILE)


# ===============================
# CONVERT AUDIO TO WAV
# ===============================

def convert_to_wav(input_file, output_file):

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            input_file,
            "-ar",
            "16000",
            "-ac",
            "1",
            output_file
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )


# ===============================
# FEATURE EXTRACTION
# ===============================

def extract_features(file_path):

    audio, sample_rate = librosa.load(
        file_path,
        sr=None
    )

    # MFCC features
    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sample_rate,
        n_mfcc=13
    )

    mfcc_mean = np.mean(
        mfcc,
        axis=1
    )

    # Mel Spectrogram features
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

    # Combine features
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
# PREDICTION
# ===============================

@app.route("/predict", methods=["POST"])
def predict():

    if "audio" not in request.files:

        return jsonify({
            "error": "No audio file uploaded"
        }), 400


    audio_file = request.files["audio"]


    # -------------------------------
    # File paths
    # -------------------------------

    original_path = os.path.join(
        UPLOAD_FOLDER,
        audio_file.filename
    )

    wav_path = os.path.join(
        UPLOAD_FOLDER,
        "converted_audio.wav"
    )


    # -------------------------------
    # Save uploaded audio
    # -------------------------------

    audio_file.save(
        original_path
    )


    try:

        print(
            "FILE RECEIVED:",
            audio_file.filename
        )


        # -------------------------------
        # Convert WebM/other audio to WAV
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
            "FEATURE EXTRACTION COMPLETED"
        )


        # -------------------------------
        # Create feature dataframe
        # -------------------------------

        feature_df = pd.DataFrame(
            [features],
            columns=[
                f"mfcc_{i+1}"
                for i in range(13)
            ]
            +
            [
                f"mel_{i+1}"
                for i in range(128)
            ]
        )


        # -------------------------------
        # ML Prediction
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

        if prediction == 0:

            result = "REAL"

            confidence = (
                probabilities[0] * 100
            )

        else:

            result = "AI-GENERATED / FAKE"

            confidence = (
                probabilities[1] * 100
            )


        print(
            "PREDICTION:",
            result
        )

        print(
            "CONFIDENCE:",
            confidence
        )


        return jsonify({

            "prediction": result,

            "confidence": round(
                confidence,
                2
            )

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

        # Delete original uploaded file
        if os.path.exists(
            original_path
        ):

            os.remove(
                original_path
            )


        # Delete converted WAV
        if os.path.exists(
            wav_path
        ):

            os.remove(
                wav_path
            )


# ===============================
# START SERVER
# ===============================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )