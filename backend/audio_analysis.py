import os
import numpy as np
import pandas as pd
import librosa


# ==========================================
# FEATURE EXTRACTION
# ==========================================

def extract_features(file_path):

    try:
        # Load audio
        audio, sample_rate = librosa.load(
            file_path,
            sr=16000,
            mono=True
        )

        # --------------------------------------
        # MFCC FEATURES
        # --------------------------------------

        mfcc = librosa.feature.mfcc(
            y=audio,
            sr=sample_rate,
            n_mfcc=13
        )

        mfcc_mean = np.mean(
            mfcc,
            axis=1
        )

        # --------------------------------------
        # MEL SPECTROGRAM
        # --------------------------------------

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

        # --------------------------------------
        # COMBINE FEATURES
        # --------------------------------------

        features = np.concatenate([
            mfcc_mean,
            mel_mean
        ])

        return features

    except Exception as e:

        print("Feature extraction error:", e)

        return None


# ==========================================
# EXTRACT DATASET FEATURES
# ==========================================

def process_dataset(dataset_path):

    data = []

    # --------------------------------------
    # REAL = 0
    # FAKE = 1
    # --------------------------------------

    categories = {
        "real": 0,
        "fake": 1
    }

    for category, label in categories.items():

        folder = os.path.join(
            dataset_path,
            category
        )

        if not os.path.exists(folder):

            print(
                f"Folder not found: {folder}"
            )

            continue

        print(
            f"\nProcessing {category.upper()} audio..."
        )

        files = os.listdir(folder)

        for filename in files:

            if not filename.lower().endswith(
                (".wav", ".mp3", ".flac", ".ogg")
            ):
                continue

            file_path = os.path.join(
                folder,
                filename
            )

            features = extract_features(
                file_path
            )

            if features is not None:

                row = list(features)

                row.append(label)

                data.append(row)

                print(
                    "Processed:",
                    filename
                )

    return data


# ==========================================
# MAIN
# ==========================================

if __name__ == "__main__":

    PROJECT_PATH = os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )

    DATASET_PATH = os.path.join(
        PROJECT_PATH,
        "dataset"
    )

    FEATURES_PATH = os.path.join(
        os.path.dirname(
            os.path.abspath(__file__)
        ),
        "features"
    )

    os.makedirs(
        FEATURES_PATH,
        exist_ok=True
    )

    output_file = os.path.join(
        FEATURES_PATH,
        "audio_features.csv"
    )

    print("\n================================")
    print("     VOXSHIELD FEATURE EXTRACTION")
    print("================================\n")

    dataset = process_dataset(
        DATASET_PATH
    )

    if len(dataset) == 0:

        print(
            "\nNo audio files were found."
        )

        exit()

    # --------------------------------------
    # COLUMN NAMES
    # --------------------------------------

    columns = []

    for i in range(13):

        columns.append(
            f"mfcc_{i + 1}"
        )

    for i in range(128):

        columns.append(
            f"mel_{i + 1}"
        )

    columns.append("label")

    # --------------------------------------
    # CREATE DATAFRAME
    # --------------------------------------

    dataframe = pd.DataFrame(
        dataset,
        columns=columns
    )

    # --------------------------------------
    # SAVE CSV
    # --------------------------------------

    dataframe.to_csv(
        output_file,
        index=False
    )

    print("\n================================")
    print("FEATURE EXTRACTION COMPLETED")
    print("================================")

    print(
        "\nTotal samples:",
        len(dataframe)
    )

    print(
        "Features:",
        len(columns) - 1
    )

    print(
        "\nSaved to:"
    )

    print(output_file)