from datasets import load_dataset
import os
import soundfile as sf

print("Loading dataset...")

dataset = load_dataset(
    "Bisher/ASVspoof_2019_LA",
    split="train",
    streaming=True
)

os.makedirs("../dataset/real", exist_ok=True)
os.makedirs("../dataset/fake", exist_ok=True)

real_count = 0
fake_count = 0

for item in dataset:

    label = item["label"]
    audio = item["audio"]

    # 0 = bonafide (REAL)
    if label == 0 and real_count < 100:
        filename = f"real_{real_count + 1:03d}.wav"
        path = os.path.join("../dataset/real", filename)

        sf.write(path, audio["array"], audio["sampling_rate"])

        real_count += 1
        print(f"REAL: {real_count}/100")

    # 1 = spoof (FAKE)
    elif label == 1 and fake_count < 100:
        filename = f"fake_{fake_count + 1:03d}.wav"
        path = os.path.join("../dataset/fake", filename)

        sf.write(path, audio["array"], audio["sampling_rate"])

        fake_count += 1
        print(f"FAKE: {fake_count}/100")

    if real_count == 100 and fake_count == 100:
        break

print("\nDataset collection complete!")
print("Real:", real_count)
print("Fake:", fake_count)