import os
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report


# ==========================================
# PROJECT PATHS
# ==========================================

BACKEND_PATH = os.path.dirname(
    os.path.abspath(__file__)
)

FEATURE_FILE = os.path.join(
    BACKEND_PATH,
    "features",
    "audio_features.csv"
)

MODEL_FOLDER = os.path.join(
    BACKEND_PATH,
    "model"
)

MODEL_FILE = os.path.join(
    MODEL_FOLDER,
    "voice_detector.pkl"
)


# Create model folder if it doesn't exist
os.makedirs(
    MODEL_FOLDER,
    exist_ok=True
)


# ==========================================
# LOAD DATASET
# ==========================================

print("\n===================================")
print("       VOXSHIELD MODEL TRAINING")
print("===================================\n")

print("Loading feature dataset...")

if not os.path.exists(FEATURE_FILE):

    print("\nERROR:")
    print("Feature file not found:")
    print(FEATURE_FILE)

    print("\nRun audio_analysis.py first.")

    exit()


data = pd.read_csv(
    FEATURE_FILE
)


print(
    "Dataset shape:",
    data.shape
)


# ==========================================
# SEPARATE FEATURES AND LABEL
# ==========================================

X = data.drop(
    columns=["label"]
)

y = data["label"]


print(
    "Number of features:",
    X.shape[1]
)

print(
    "Number of samples:",
    X.shape[0]
)


# ==========================================
# TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(

    X,
    y,

    test_size=0.20,

    random_state=42,

    stratify=y
)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ==========================================
# CREATE RANDOM FOREST MODEL
# ==========================================

print("\nTraining Random Forest model...")

model = RandomForestClassifier(

    n_estimators=200,

    random_state=42,

    class_weight="balanced",

    n_jobs=-1
)


# ==========================================
# TRAIN
# ==========================================

model.fit(
    X_train,
    y_train
)


print("Training completed.")


# ==========================================
# PREDICTION
# ==========================================

y_pred = model.predict(
    X_test
)


# ==========================================
# ACCURACY
# ==========================================

accuracy = accuracy_score(
    y_test,
    y_pred
)


print("\n===================================")
print("             RESULTS")
print("===================================\n")

print(
    f"Model Accuracy: {accuracy * 100:.2f}%"
)


# ==========================================
# CLASSIFICATION REPORT
# ==========================================

print("\nClassification Report:\n")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "REAL",
            "FAKE"
        ]
    )
)


# ==========================================
# SAVE MODEL
# ==========================================

joblib.dump(
    model,
    MODEL_FILE
)


print("\n===================================")
print("       MODEL SAVED SUCCESSFULLY")
print("===================================\n")

print(
    "Model location:"
)

print(
    MODEL_FILE
)

print("\nVoxShield ML model is ready.")