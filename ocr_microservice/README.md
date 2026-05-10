# DigiBank CIN OCR Microservice

Free FastAPI service for Moroccan CIN pre-verification.

It uses:
- PaddleOCR first for OCR extraction, with EasyOCR fallback
- OpenCV for document-shape, blur, resolution, and text-density checks
- Moroccan CIN keyword and regex scoring

Run locally:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8010
```

Laravel config:

```env
CIN_AI_SERVICE_URL=http://127.0.0.1:8010
CIN_AI_SERVICE_TIMEOUT=30
```

Endpoint:

```http
POST /verify-cin
Content-Type: multipart/form-data
file=@cin-front.jpg
```
