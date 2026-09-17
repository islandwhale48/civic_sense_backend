import sys
import os
from flask import Flask, request, jsonify

# Ensure local folder is in sys.path for IDE linter & interpreter resolution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from detector import analyze_civic_image
except ImportError:
    from ai_detector.detector import analyze_civic_image

app = Flask(__name__)

@app.route('/detect', methods=['POST'])
def detect_image():
    if 'image' in request.files:
        file = request.files['image']
        img_bytes = file.read()
        result = analyze_civic_image(img_bytes)
        return jsonify(result)
    elif request.data:
        result = analyze_civic_image(request.data)
        return jsonify(result)
    else:
        return jsonify({
            "isValidCivicPhoto": True,
            "isSelfie": False,
            "confidence": 0.5,
            "reason": "No image payload sent."
        })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "Python AI Image Detector"})

if __name__ == '__main__':
    print("Python AI Selfie & Image Detector running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001)
