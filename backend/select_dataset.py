import os
import random
import shutil

SOURCE = r"C:\Users\LENOVO\Downloads\for-2sec\for-2seconds\training"

PROJECT = r"C:\Users\LENOVO\OneDrive\Desktop\VoxShield"

REAL_SOURCE = os.path.join(SOURCE, "real")
FAKE_SOURCE = os.path.join(SOURCE, "fake")

REAL_DEST = os.path.join(PROJECT, "dataset", "real")
FAKE_DEST = os.path.join(PROJECT, "dataset", "fake")

NUMBER_OF_FILES = 200

os.makedirs(REAL_DEST, exist_ok=True)
os.makedirs(FAKE_DEST, exist_ok=True)


def get_audio_files(folder):
    extensions = (".wav", ".flac", ".mp3")
    files = []

    for root, dirs, filenames in os.walk(folder):
        for filename in filenames:
            if filename.lower().endswith(extensions):
                files.append(os.path.join(root, filename))

    return files


real_files = get_audio_files(REAL_SOURCE)
fake_files = get_audio_files(FAKE_SOURCE)

print("Real files found:", len(real_files))
print("Fake files found:", len(fake_files))

random.seed(42)

real_selected = random.sample(real_files, min(NUMBER_OF_FILES, len(real_files)))
fake_selected = random.sample(fake_files, min(NUMBER_OF_FILES, len(fake_files)))


for i, file in enumerate(real_selected, 1):
    extension = os.path.splitext(file)[1]
    destination = os.path.join(REAL_DEST, f"real_{i:03d}{extension}")
    shutil.copy2(file, destination)

for i, file in enumerate(fake_selected, 1):
    extension = os.path.splitext(file)[1]
    destination = os.path.join(FAKE_DEST, f"fake_{i:03d}{extension}")
    shutil.copy2(file, destination)


print()
print("Dataset selection completed!")
print("Real files copied:", len(real_selected))
print("Fake files copied:", len(fake_selected))
print("Total files:", len(real_selected) + len(fake_selected))