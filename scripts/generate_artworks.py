"""Generate kid-style artwork images using Gemini Imagen API."""
import requests
import base64
import json
import os
import time

API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY environment variable")
MODEL = "imagen-4.0-generate-001"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:predict?key={API_KEY}"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "artworks")
os.makedirs(OUT_DIR, exist_ok=True)

prompts = [
    {"id": "rainbow_land", "artist": "김하늘", "title": "무지개 나라",
     "prompt": "A colorful children's crayon drawing of a rainbow land with fluffy clouds, a smiling sun, and a small child walking on the rainbow bridge. Bright pastel colors, childlike art style, simple and cheerful, on white paper."},
    {"id": "ocean_friends", "artist": "김하늘", "title": "바다 속 친구들",
     "prompt": "A child's watercolor painting of an underwater ocean scene with cute smiling fish, a friendly octopus, colorful coral, and bubbles. Childlike naive art style, bright blue and teal colors."},
    {"id": "spring_garden", "artist": "김하늘", "title": "봄날의 정원",
     "prompt": "A kid's crayon drawing of a beautiful spring garden with colorful tulips, daisies, butterflies, and a happy bunny. Childlike art style, green grass, bright flowers, blue sky."},
    {"id": "robot_kingdom", "artist": "이서준", "title": "로봇 왕국",
     "prompt": "A child's marker drawing of a futuristic robot city with friendly robots, flying cars, and tall colorful buildings. Childlike style, bold lines, bright metallic colors."},
    {"id": "dino_adventure", "artist": "이서준", "title": "공룡 대모험",
     "prompt": "A kid's crayon drawing of a large friendly green dinosaur playing with a small boy in a prehistoric jungle with volcanoes and palm trees. Childlike naive art, bold colors."},
    {"id": "space_explore", "artist": "이서준", "title": "우주 탐험",
     "prompt": "A child's painting of outer space with a cute rocket ship, planets with rings, stars, a smiling moon, and an astronaut waving. Dark blue background, childlike style, bright colors."},
    {"id": "cat_family", "artist": "박소율", "title": "고양이 가족",
     "prompt": "A cute children's drawing of a happy cat family - mama cat, papa cat, and kittens playing with yarn balls. Soft pastel colors, childlike crayon style, warm and cozy feeling."},
    {"id": "magic_forest", "artist": "박소율", "title": "마법의 숲",
     "prompt": "A child's watercolor painting of an enchanted forest with glowing mushrooms, tiny fairies, a talking tree, and fireflies. Magical childlike art style, green and purple tones."},
    {"id": "rainbow_cake", "artist": "박소율", "title": "무지개 케이크",
     "prompt": "A kid's colorful drawing of a giant rainbow layered cake with candles, sprinkles, cherries on top, and a happy child looking at it. Bright fun colors, childlike style."},
    {"id": "superhero", "artist": "최도현", "title": "슈퍼히어로",
     "prompt": "A child's marker drawing of an original superhero character flying through the sky with a cape, mask, and lightning bolts. Bold primary colors, childlike comic style, city skyline below."},
    {"id": "pirate_ship", "artist": "최도현", "title": "해적선 모험",
     "prompt": "A kid's crayon drawing of a wooden pirate ship on ocean waves with a skull flag, treasure chest, parrot, and a child pirate captain. Adventurous childlike art style."},
    {"id": "cloud_village", "artist": "정예은", "title": "구름 나라",
     "prompt": "A dreamy child's pastel drawing of a tiny village on fluffy clouds with small houses, a rainbow slide, and angels playing. Soft pastel colors, ethereal childlike style."},
    {"id": "dream_park", "artist": "정예은", "title": "꿈의 놀이공원",
     "prompt": "A child's colorful drawing of a fantasy amusement park with a candy ferris wheel, ice cream roller coaster, and cotton candy trees. Bright joyful colors, childlike imagination."},
    {"id": "swirl_abstract", "artist": "한지우", "title": "소용돌이",
     "prompt": "A child's abstract crayon art with colorful swirling patterns, spirals in purple, blue, orange, and pink. Bold expressive strokes, creative childlike abstract art on white paper."},
    {"id": "night_city", "artist": "한지우", "title": "도시의 밤",
     "prompt": "A kid's painting of a city at night with glowing neon signs, colorful windows in tall buildings, a crescent moon, and stars. Dark blue sky, vibrant neon colors, childlike style."},
    {"id": "music_colors", "artist": "한지우", "title": "음악이 보여요",
     "prompt": "A child's synesthesia art - musical notes and instruments painted in swirling bright colors, with a piano, guitar, and dancing notes. Abstract childlike style, joyful and colorful."},
]

def generate_image(prompt_text, output_path):
    payload = {
        "instances": [{"prompt": prompt_text}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "4:3",
            "personGeneration": "dont_allow",
        }
    }
    resp = requests.post(URL, json=payload, timeout=60)
    if resp.status_code != 200:
        print(f"  ERROR {resp.status_code}: {resp.text[:200]}")
        return False
    data = resp.json()
    predictions = data.get("predictions", [])
    if not predictions:
        print(f"  ERROR: no predictions returned")
        return False
    img_b64 = predictions[0].get("bytesBase64Encoded")
    if not img_b64:
        print(f"  ERROR: no image data")
        return False
    with open(output_path, "wb") as f:
        f.write(base64.b64decode(img_b64))
    return True

results = []
for i, item in enumerate(prompts):
    fname = f"{item['id']}.png"
    fpath = os.path.join(OUT_DIR, fname)
    if os.path.exists(fpath) and os.path.getsize(fpath) > 1000:
        print(f"[{i+1}/{len(prompts)}] SKIP {fname} (exists)")
        results.append({"id": item["id"], "file": fname, "artist": item["artist"],
                         "title": item["title"], "ok": True})
        continue
    print(f"[{i+1}/{len(prompts)}] Generating {fname}...")
    ok = generate_image(item["prompt"], fpath)
    results.append({"id": item["id"], "file": fname, "artist": item["artist"],
                     "title": item["title"], "ok": ok})
    if ok:
        sz = os.path.getsize(fpath)
        print(f"  OK ({sz//1024} KB)")
    time.sleep(1)

print(f"\nDone: {sum(1 for r in results if r['ok'])}/{len(results)} images generated")
with open(os.path.join(OUT_DIR, "manifest.json"), "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
