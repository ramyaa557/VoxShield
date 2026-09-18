import os
import numpy as np
import pandas as pd
import librosa
import joblib


# Project path
PROJECT = r"C:\Users\LENOVO\OneDrive\Desktop\VoxShield"

MODEL_FILE = os.path.join(
    PROJECT,
    "backend",
    "model",
    "voice_detector.pkl"
)


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
    features = np.concatenate([
        mfcc_mean,
        mel_mean
    ])

    return features


# Ask user for audio file
audio_file = input(
    "Enter the path of the audio file: "
).strip().strip('"')


# Check file
if not os.path.exists(audio_file):

    print("\nAudio file not found!")

    exit()


print("\nLoading trained model...")

model = joblib.load(MODEL_FILE)

print("Model loaded successfully!")


print("\nAnalyzing audio...")

features = extract_features(audio_file)


# Convert to DataFrame
features = pd.DataFrame(
    [features],
    columns=[
        f"mfcc_{i+1}" for i in range(13)
    ] + [
        f"mel_{i+1}" for i in range(128)
    ]
)


# Prediction
prediction = model.predict(features)[0]

probability = model.predict_proba(features)[0]


# Display result
print("\n================================")
print("       VOXSHIELD RESULT")
print("================================")


if prediction == 0:

    confidence = probability[0] * 100

    print("Prediction : REAL")
    print("Confidence : {:.2f}%".format(confidence))

else:

    confidence = probability[1] * 100

    print("Prediction : AI-GENERATED / FAKE")
    print("Confidence : {:.2f}%".format(confidence))


print("================================")