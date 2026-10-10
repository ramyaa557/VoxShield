
import librosa
import numpy as np


def extract_dashboard_features(file_path):
    # Load audio
    y, sr = librosa.load(file_path, sr=16000)

    # Duration
    duration = librosa.get_duration(y=y, sr=sr)

    # Pitch
    pitch_values = librosa.yin(
        y,
        fmin=50,
        fmax=500,
        sr=sr
    )
    pitch_hz = float(np.mean(pitch_values))

    # Dominant frequency
    fft_values = np.abs(np.fft.rfft(y))
    frequencies = np.fft.rfftfreq(len(y), d=1 / sr)
    dominant_frequency = float(
        frequencies[np.argmax(fft_values)]
    )

    # Spectral features
    spectral_centroid = float(
        np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
    )

    spectral_bandwidth = float(
        np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr))
    )

    # RMS energy
    rms_energy = float(
        np.mean(librosa.feature.rms(y=y))
    )

    # Feature levels
    pitch_level = min(pitch_hz / 540 * 100, 100)
    frequency_level = min(dominant_frequency / 10000 * 100, 100)
    centroid_level = min(spectral_centroid / 8000 * 100, 100)
    bandwidth_level = min(spectral_bandwidth / 8000 * 100, 100)
    rms_level = min(rms_energy * 1000, 100)

    # Waveform data for the frontend dashboard
    waveform = y[::max(1, len(y) // 200)].tolist()

    # Return data without printing detailed analysis
    return {
        "pitch_hz": round(pitch_hz, 2),
        "frequency_hz": round(dominant_frequency, 2),
        "spectral_centroid_hz": round(spectral_centroid, 2),
        "spectral_bandwidth_hz": round(spectral_bandwidth, 2),
        "rms_energy": round(rms_energy, 5),
        "sample_rate": sr,
        "duration_seconds": round(duration, 2),
        "pitch_level": round(pitch_level, 2),
        "frequency_level": round(frequency_level, 2),
        "centroid_level": round(centroid_level, 2),
        "bandwidth_level": round(bandwidth_level, 2),
        "rms_level": round(rms_level, 2),
        "waveform": waveform
    }
