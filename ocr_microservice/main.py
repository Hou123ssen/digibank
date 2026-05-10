import os
import re
import tempfile
import unicodedata
from functools import lru_cache
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

app = FastAPI(title="DigiBank Moroccan CIN Verification")

CIN_RE = re.compile(r"\b[A-Z]{1,2}\s?[0-9]{4,8}\b", re.IGNORECASE)

IDENTITY_KEYWORDS = [
    "ROYAUME DU MAROC",
    "CARTE NATIONALE",
    "CARTE NATIONALE DIDENTITE",
    "CARTE NATIONALE D IDENTITE",
    "IDENTITE",
    "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u063a\u0631\u0628\u064a\u0629",
    "\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0648\u0637\u0646\u064a\u0629",
]

PARTIAL_KEYWORDS = [
    "ROYAUME",
    "MAROC",
    "CARTE",
    "NATIONALE",
    "IDENTITE",
    "\u0627\u0644\u0645\u0645\u0644\u0643\u0629",
    "\u0627\u0644\u0645\u063a\u0631\u0628\u064a\u0629",
    "\u0627\u0644\u0628\u0637\u0627\u0642\u0629",
    "\u0627\u0644\u0648\u0637\u0646\u064a\u0629",
]

DEBUG_PREPROCESSED_DIR = os.getenv(
    "OCR_DEBUG_PREPROCESSED_DIR",
    os.path.join(tempfile.gettempdir(), "digibank_ocr_debug"),
)


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("'", " ").replace("\u2019", " ").replace("-", " ")
    text = re.sub(r"\s+", " ", text)
    return text.upper().strip()


@lru_cache(maxsize=4)
def get_paddleocr_reader(lang: str) -> Any | None:
    try:
        from paddleocr import PaddleOCR

        return PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
    except Exception:
        return None


@lru_cache(maxsize=1)
def get_easyocr_reader() -> Any:
    import easyocr

    return easyocr.Reader(["fr", "ar", "en"], gpu=os.getenv("OCR_GPU", "false").lower() == "true")


def preprocess_image(image: np.ndarray) -> list[np.ndarray]:
    image = cv2.resize(image, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 18, 7, 21)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    contrasted = clahe.apply(denoised)
    blurred = cv2.GaussianBlur(contrasted, (0, 0), 1.2)
    sharpened = cv2.addWeighted(contrasted, 1.9, blurred, -0.9, 0)
    threshold = cv2.adaptiveThreshold(
        sharpened,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        9,
    )
    return [gray, contrasted, sharpened, threshold]


def write_temp_image(image: np.ndarray, prefix: str = "ocr") -> str:
    os.makedirs(DEBUG_PREPROCESSED_DIR, exist_ok=True)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png", prefix=f"{prefix}_", dir=DEBUG_PREPROCESSED_DIR)
    tmp.close()
    cv2.imwrite(tmp.name, image)
    return tmp.name


def normalize_ocr_rows(rows: list[Any]) -> list[tuple[Any, str, float]]:
    normalized = []
    for row in rows:
        if len(row) >= 2 and isinstance(row[1], (list, tuple)) and len(row[1]) >= 2:
            normalized.append((row[0], str(row[1][0]), float(row[1][1])))
        elif len(row) >= 3:
            normalized.append((row[0], str(row[1]), float(row[2])))
    return normalized


def run_paddleocr(image_paths: list[str]) -> tuple[str, list[tuple[Any, str, float]]]:
    readers = [reader for reader in [get_paddleocr_reader("fr"), get_paddleocr_reader("ar")] if reader is not None]
    rows = []
    for reader in readers:
        for path in image_paths:
            result = reader.ocr(path, cls=True) or []
            for page in result:
                rows.extend(normalize_ocr_rows(page or []))
    return " ".join(row[1] for row in rows if row[1]), rows


def run_easyocr(image_paths: list[str]) -> tuple[str, list[tuple[Any, str, float]]]:
    reader = get_easyocr_reader()
    rows = []
    for path in image_paths:
        rows.extend(normalize_ocr_rows(reader.readtext(path, detail=1, paragraph=False)))
    return " ".join(row[1] for row in rows if row[1]), rows


def run_ocr(image: np.ndarray, original_path: str) -> tuple[str, list[tuple[Any, str, float]], list[str], str]:
    preprocessed_paths = [
        write_temp_image(img, prefix=f"cin_{idx}")
        for idx, img in enumerate(preprocess_image(image), start=1)
    ]
    image_paths = [original_path, *preprocessed_paths]
    paddle_text, paddle_rows = run_paddleocr(image_paths)
    easy_text, easy_rows = run_easyocr(image_paths) if len(normalize_text(paddle_text).replace(" ", "")) < 30 else ("", [])
    engine = "paddleocr+easyocr" if easy_text else "paddleocr"

    return " ".join(part for part in [paddle_text, easy_text] if part), paddle_rows + easy_rows, preprocessed_paths, engine


def score_blur(gray: np.ndarray) -> int:
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return int(max(0, min(100, variance / 3)))


def score_resolution(image: np.ndarray) -> int:
    height, width = image.shape[:2]
    pixels = width * height
    if width < 400 or height < 250:
        return 20
    if pixels < 350_000:
        return 55
    if pixels < 900_000:
        return 80
    return 100


def score_document_shape(gray: np.ndarray) -> tuple[int, bool]:
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    image_area = gray.shape[0] * gray.shape[1]
    best_score = 0

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.06:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.035 * perimeter, True)
        _, _, w, h = cv2.boundingRect(contour)
        aspect = max(w / max(h, 1), h / max(w, 1))
        rectangularity = area / max(w * h, 1)

        score = 0
        if len(approx) == 4:
            score += 40
        if 1.25 <= aspect <= 2.35:
            score += 30
        if rectangularity >= 0.45:
            score += 20
        if area >= image_area * 0.15:
            score += 10
        best_score = max(best_score, min(score, 100))

    return best_score, best_score >= 45


def score_text_density(rows: list[tuple[Any, str, float]], image: np.ndarray, normalized_text: str) -> int:
    if not rows or len(normalized_text.replace(" ", "")) < 8:
        return 0
    image_area = image.shape[0] * image.shape[1]
    text_area = 0.0
    confident_rows = 0
    for box, text, confidence in rows:
        if not text or confidence < 0.12:
            continue
        text_area += cv2.contourArea(np.array(box, dtype=np.float32))
        confident_rows += 1
    area_ratio = text_area / max(image_area, 1)
    return int(max(0, min(100, min(55, confident_rows * 7) + min(45, int(area_ratio * 1400)))))


def keyword_score(normalized_text: str) -> tuple[int, list[str]]:
    matched = [kw for kw in IDENTITY_KEYWORDS if normalize_text(kw) in normalized_text]
    partial = [kw for kw in PARTIAL_KEYWORDS if normalize_text(kw) in normalized_text]
    return min(100, (len(matched) * 25) + (len(partial) * 12)), sorted(set(matched + partial))


def score_face_photo_area(image: np.ndarray) -> tuple[int, bool]:
    height, width = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    skin_mask = cv2.inRange(hsv, np.array([0, 20, 50], dtype=np.uint8), np.array([35, 180, 255], dtype=np.uint8))
    left_region = skin_mask[:, : int(width * 0.48)]
    ratio = cv2.countNonZero(left_region) / max(left_region.shape[0] * left_region.shape[1], 1)
    if 0.015 <= ratio <= 0.35:
        return min(100, int(ratio * 500)), True
    return 0, False


def score_barcode_area(gray: np.ndarray) -> tuple[int, bool]:
    detector = cv2.QRCodeDetector()
    _, points, _ = detector.detectAndDecode(gray)
    if points is not None and len(points) > 0:
        return 100, True

    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=-1)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=-1)
    gradient = cv2.convertScaleAbs(cv2.subtract(grad_x, grad_y))
    blurred = cv2.blur(gradient, (9, 9))
    _, thresh = cv2.threshold(blurred, 180, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 7))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    image_area = gray.shape[0] * gray.shape[1]
    best_score = 0

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.005:
            continue
        _, _, w, h = cv2.boundingRect(contour)
        aspect = max(w / max(h, 1), h / max(w, 1))
        if 1.8 <= aspect <= 8.0:
            best_score = max(best_score, min(85, int((area / max(image_area, 1)) * 1200) + 35))

    return best_score, best_score >= 45


def extract_birth_date(normalized_text: str) -> str | None:
    match = re.search(r"\b([0-3]?\d)[/\-. ]([01]?\d)[/\-. ]((?:19|20)\d{2})\b", normalized_text)
    if not match:
        return None
    day, month, year = match.groups()
    return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"


def extract_full_name(normalized_text: str) -> str | None:
    match = re.search(r"(?:NOM|PRENOM|NAME)\s+([A-Z ]{5,60})", normalized_text)
    if not match:
        return None
    return re.sub(r"\s+", " ", match.group(1)).strip() or None


@app.post("/verify-cin")
async def verify_cin(file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty image file.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        image = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=422, detail="Unsupported image file.")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        extracted_text, rows, preprocessed_paths, ocr_engine = run_ocr(image, tmp_path)
        normalized = normalize_text(extracted_text)

        kw_score, matched_keywords = keyword_score(normalized)
        cin_matches = [match.group(0).replace(" ", "").upper() for match in CIN_RE.finditer(normalized)]
        extracted_cin = cin_matches[0] if cin_matches else None

        blur = score_blur(gray)
        resolution = score_resolution(image)
        shape_score, shape_detected = score_document_shape(gray)
        density = score_text_density(rows, image, normalized)
        face_score, face_detected = score_face_photo_area(image)
        barcode_score, barcode_detected = score_barcode_area(gray)
        has_text_signal = bool(extracted_cin or kw_score > 0 or len(normalized.replace(" ", "")) >= 12)
        document_detected = bool(shape_detected or barcode_detected or (face_detected and has_text_signal))

        confidence = round(
            (kw_score * 0.24)
            + ((100 if extracted_cin else 0) * 0.22)
            + (density * 0.12)
            + (shape_score * 0.16)
            + (blur * 0.05)
            + (resolution * 0.05)
            + (face_score * 0.08)
            + (barcode_score * 0.08)
        )
        if shape_detected and face_detected:
            confidence += 10
        if barcode_detected and (kw_score > 0 or extracted_cin or density >= 15):
            confidence += 10
        if shape_detected and (kw_score > 0 or extracted_cin):
            confidence += 8

        score_calculation = {
            "keyword_score": kw_score,
            "cin_score": 100 if extracted_cin else 0,
            "text_density_score": density,
            "document_shape_score": shape_score,
            "blur_score": blur,
            "resolution_score": resolution,
            "face_photo_score": face_score,
            "barcode_score": barcode_score,
            "weighted_formula": {
                "keyword_score_x_0_24": round(kw_score * 0.24, 2),
                "cin_score_x_0_22": round((100 if extracted_cin else 0) * 0.22, 2),
                "text_density_score_x_0_12": round(density * 0.12, 2),
                "document_shape_score_x_0_16": round(shape_score * 0.16, 2),
                "blur_score_x_0_05": round(blur * 0.05, 2),
                "resolution_score_x_0_05": round(resolution * 0.05, 2),
                "face_photo_score_x_0_08": round(face_score * 0.08, 2),
                "barcode_score_x_0_08": round(barcode_score * 0.08, 2),
            },
            "boosts": {
                "shape_and_face": 10 if shape_detected and face_detected else 0,
                "barcode_with_text_signal": 10 if barcode_detected and (kw_score > 0 or extracted_cin or density >= 15) else 0,
                "shape_with_keyword_or_cin": 8 if shape_detected and (kw_score > 0 or extracted_cin) else 0,
            },
            "final_score": int(max(0, min(100, confidence))),
        }

        detected_signals = {
            "cin": extracted_cin is not None,
            "keywords": kw_score > 0,
            "face_photo": face_detected,
            "barcode": barcode_detected,
            "document_shape": shape_detected,
        }
        has_any_signal = any(detected_signals.values())
        suspicious = confidence < 20 or not has_any_signal or not document_detected

        result = {
            "document_detected": document_detected,
            "extracted_cin_number": extracted_cin,
            "cin_matches": cin_matches,
            "extracted_full_name": extract_full_name(normalized),
            "extracted_birth_date": extract_birth_date(normalized),
            "keyword_score": kw_score,
            "text_density_score": density,
            "document_shape_score": shape_score,
            "blur_score": blur,
            "face_photo_score": face_score,
            "face_photo_detected": face_detected,
            "barcode_score": barcode_score,
            "barcode_detected": barcode_detected,
            "confidence_score": int(max(0, min(100, confidence))),
            "suspicious": suspicious,
            "extracted_text": extracted_text,
            "matched_keywords": matched_keywords,
            "detected_signals": detected_signals,
            "score_calculation": score_calculation,
            "preprocessed_image_paths": preprocessed_paths,
            "ocr_engine": ocr_engine,
        }
        print({
            "ocr_engine": ocr_engine,
            "extracted_text": extracted_text,
            "regex_result": extracted_cin,
            "cin_matches": cin_matches,
            "keyword_matches": matched_keywords,
            "confidence_score": result["confidence_score"],
            "score_calculation": score_calculation,
            "detected_signals": detected_signals,
            "preprocessed_image_paths": preprocessed_paths,
            "rejection_reason": "suspicious" if suspicious else None,
        })
        return result
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
