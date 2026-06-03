"""Generate remaining artwork images."""
import requests, base64, os, time

API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY environment variable")
MODEL = "imagen-4.0-generate-001"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:predict?key={API_KEY}"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "artworks")

prompts = [
    {"id": "starry_night", "prompt": "A child's crayon drawing of a beautiful starry night sky with twinkling stars, a glowing crescent moon with a face, shooting stars, and a small child on a hill looking up in wonder. Dark blue background, childlike art style."},
    {"id": "flower_field", "prompt": "A kid's colorful crayon drawing of a happy bunny playing in a bright flower field with roses, sunflowers, daisies, and butterflies. Warm colors, childlike naive art style, green grass, blue sky."},
    {"id": "winter_kingdom", "prompt": "A child's watercolor painting of a magical winter wonderland with snow-covered houses, a snowman, children playing, pine trees with snow, and gentle snowfall. Soft blues and whites, childlike style."},
    {"id": "dragon_knight", "prompt": "A kid's crayon drawing of a brave little knight and a friendly green dragon sitting together as friends, with a medieval castle in the background. Warm and friendly childlike art style, bold colors."},
    {"id": "moon_and_stars", "prompt": "A dreamy child's pastel drawing of a smiling moon and cute star characters playing together in a night sky with clouds. Soft yellow, white, and deep blue colors, whimsical childlike style."},
    {"id": "mermaid_sea", "prompt": "A child's sparkling drawing of an underwater mermaid palace with a little mermaid princess, jewels, seashells, colorful fish, and coral. Shimmering teal and pink tones, magical childlike art style."},
]

def generate_image(prompt_text, output_path):
    payload = {
        "instances": [{"prompt": prompt_text}],
        "parameters": {"sampleCount": 1, "aspectRatio": "4:3", "personGeneration": "dont_allow"}
    }
    resp = requests.post(URL, json=payload, timeout=60)
    if resp.status_code != 200:
        print(f"  ERROR {resp.status_code}: {resp.text[:200]}")
        return False
    data = resp.json()
    predictions = data.get("predictions", [])
    if not predictions:
        return False
    img_b64 = predictions[0].get("bytesBase64Encoded")
    if not img_b64:
        return False
    with open(output_path, "wb") as f:
        f.write(base64.b64decode(img_b64))
    return True

for i, item in enumerate(prompts):
    fname = f"{item['id']}.png"
    fpath = os.path.join(OUT_DIR, fname)
    print(f"[{i+1}/{len(prompts)}] Generating {fname}...")
    ok = generate_image(item["prompt"], fpath)
    if ok:
        print(f"  OK ({os.path.getsize(fpath)//1024} KB)")
    else:
        print(f"  FAILED")
    time.sleep(1)

print("Done!")
