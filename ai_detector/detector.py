import sys
import json
import os

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None

def detect_skin_ratio(img):
    """
    Calculates the proportion of human skin tones in HSV color space.
    """
    try:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Range for human skin tone in HSV
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([25, 255, 255], dtype=np.uint8)
        
        mask = cv2.inRange(hsv, lower_skin, upper_skin)
        
        # Apply morphological operations to reduce noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.erode(mask, kernel, iterations=1)
        mask = cv2.dilate(mask, kernel, iterations=1)

        skin_pixels = cv2.countNonZero(mask)
        total_pixels = img.shape[0] * img.shape[1]
        
        return skin_pixels / total_pixels
    except Exception:
        return 0.0

def analyze_civic_image(image_path_or_bytes):
    """
    High-sensitivity AI Detector for Human Faces, Selfies, and Non-Civic Content.
    """
    if cv2 is None:
        return {
            "isValidCivicPhoto": True,
            "isSelfie": False,
            "confidence": 0.5,
            "reason": "OpenCV not loaded, skipping vision verification."
        }

    try:
        if isinstance(image_path_or_bytes, bytes):
            nparr = np.frombuffer(image_path_or_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            img = cv2.imread(image_path_or_bytes)

        if img is None:
            return {
                "isValidCivicPhoto": False,
                "isSelfie": False,
                "confidence": 0.9,
                "reason": "Invalid or corrupt image file."
            }

        height, width = img.shape[:2]
        total_area = width * height
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray) # Equalize histogram to improve contrast for face detection

        # Load multiple OpenCV Haar Cascades for maximum face & selfie detection coverage
        data_path = cv2.data.haarcascades
        cascades = [
            cv2.CascadeClassifier(data_path + 'haarcascade_frontalface_default.xml'),
            cv2.CascadeClassifier(data_path + 'haarcascade_frontalface_alt.xml'),
            cv2.CascadeClassifier(data_path + 'haarcascade_frontalface_alt2.xml'),
            cv2.CascadeClassifier(data_path + 'haarcascade_profileface.xml')
        ]

        eye_cascade = cv2.CascadeClassifier(data_path + 'haarcascade_eye.xml')

        detected_faces = []
        for cascade in cascades:
            if not cascade.empty():
                found = cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.05,
                    minNeighbors=3,
                    minSize=(30, 30)
                )
                if len(found) > 0:
                    detected_faces.extend(found)

        # Eye detection for close-up portraits
        eyes = eye_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(20, 20))

        skin_ratio = detect_skin_ratio(img)

        # Decision Logic:
        # 1. Any face detected taking > 2% of total image area
        # 2. Or >= 2 human faces detected
        # 3. Or >= 2 eyes detected alongside high skin tone (> 12% skin ratio)
        # 4. Or high skin tone (> 25% skin ratio) typical of close-up selfies
        
        max_face_area = 0
        for (x, y, w, h) in detected_faces:
            area = w * h
            if area > max_face_area:
                max_face_area = area

        face_area_ratio = max_face_area / total_area if total_area > 0 else 0

        is_selfie = (
            len(detected_faces) > 0 or
            face_area_ratio > 0.02 or
            (len(eyes) >= 2 and skin_ratio > 0.10) or
            skin_ratio > 0.25
        )

        if is_selfie:
            return {
                "isValidCivicPhoto": False,
                "isSelfie": True,
                "confidence": 0.98,
                "reason": "Selfie or human face photo detected. Please upload a clear photo of the civic issue (e.g., pothole, waste dump, streetlight, water leak)."
            }

        return {
            "isValidCivicPhoto": True,
            "isSelfie": False,
            "confidence": 0.95,
            "reason": "Valid civic issue photo verified."
        }

    except Exception as e:
        return {
            "isValidCivicPhoto": True,
            "isSelfie": False,
            "confidence": 0.5,
            "reason": f"Analysis notice: {str(e)}"
        }

if __name__ == '__main__':
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        result = analyze_civic_image(img_path)
        print(json.dumps(result))
    else:
        print(json.dumps({
            "isValidCivicPhoto": True,
            "isSelfie": False,
            "reason": "No image specified."
        }))
