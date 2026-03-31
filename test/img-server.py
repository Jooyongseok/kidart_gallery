"""
KidArt Gallery — 로컬 이미지 생성 서버 (CPU 전용)
GPU는 VLM 전용, 이미지 생성은 CPU에서 실행
SDXL Turbo 4스텝 → CPU에서 ~15-30초/이미지
포트: 8101
"""
import io
import json
import base64
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import torch
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image
from PIL import Image

MODEL_ID = "stabilityai/sd-turbo"
DEVICE = "cpu"

print("Loading SD Turbo on CPU...")
txt2img = AutoPipelineForText2Image.from_pretrained(
    MODEL_ID, torch_dtype=torch.float32
)
img2img = AutoPipelineForImage2Image.from_pipe(txt2img)
print(f"Model loaded on CPU — ready for requests")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        prompt = body.get("prompt", body.get("inputs", "a children's drawing"))
        seed = body.get("seed", 42)
        ref_b64 = body.get("image", None)

        generator = torch.Generator(DEVICE).manual_seed(seed)
        t0 = time.time()

        try:
            if ref_b64:
                ref_bytes = base64.b64decode(ref_b64)
                ref_img = Image.open(io.BytesIO(ref_bytes)).convert("RGB").resize((512, 512))
                result = img2img(
                    prompt=prompt, image=ref_img,
                    strength=0.45, guidance_scale=0.0,
                    num_inference_steps=4, generator=generator
                ).images[0]
            else:
                result = txt2img(
                    prompt=prompt, guidance_scale=0.0,
                    num_inference_steps=4, generator=generator,
                    width=body.get("width", 512), height=body.get("height", 512)
                ).images[0]

            buf = io.BytesIO()
            result.save(buf, format="PNG")
            img_bytes = buf.getvalue()
            elapsed = time.time() - t0

            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(img_bytes)))
            self.end_headers()
            self.wfile.write(img_bytes)
            print(f"[OK] {elapsed:.1f}s | {prompt[:60]}...")

        except Exception as e:
            import traceback
            traceback.print_exc()
            err = json.dumps({"error": str(e)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(err)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = 8101
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Image server: http://localhost:{port}")
    server.serve_forever()
