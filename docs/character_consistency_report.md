# KidArt Gallery - Character Consistency Pipeline
## 2025-2026 최신 기술 리서치 + 구현 현황 리포트

**Date**: 2026-06-04 | **Project**: KidArt Gallery

---

## 1. 캐릭터 추출 / 세그멘테이션

| 모델 | 일관성 | 비용 | API | 아동그림 적합 | 현재 상태 |
|------|--------|------|-----|-------------|----------|
| SAM3 (Meta, 2025.11) | 5/5 | 오픈소스 | HuggingFace | 4/5 | 미구현 |
| SAM 2.1 | 4/5 | ~$0.005 | Replicate | 3/5 | 계획 |
| **BiRefNet (fal.ai)** | 4/5 | ~$0.003 | fal-ai/birefnet | **5/5** | **구현 완료** |
| InSPyReNet | 3/5 | ~$0.003 | 851-labs | 4/5 | 미구현 |
| **rembg (U2-Net)** | 3/5 | 무료(로컬) | pip install | 3/5 | **구현 완료** |
| GroundingDINO+SAM | 4/5 | 오픈소스 | ComfyUI | 3/5 | 미구현 |

**권장**: BiRefNet(fal.ai) 우선 → rembg fallback (현재 구현됨)

---

## 2. 캐릭터 일관성 이미지 생성 (핵심)

| Provider | 일관성 | 비용/장 | API | 참조이미지 | 아동그림 | 현재 상태 |
|----------|--------|---------|-----|-----------|---------|----------|
| **Flux 2 Pro (fal.ai)** | 5/5 | $0.03-0.06 | fal.ai | 10장 멀티레퍼런스 | **5/5** | **구현 완료** |
| **Flux Kontext Pro** | 5/5 | $0.04-0.08 | fal.ai | Yes | **5/5** | **구현 완료** |
| **Ideogram 3.0** | 5/5 | $0.037-0.112 | ideogram.ai | Yes | 4/5 | **구현 완료** |
| **GPT Image 2** | 4/5 | $0.005-0.211 | OpenAI | Yes | 4/5 | **구현 완료** |
| Midjourney V7 (--oref) | 5/5 | ~$0.15 | 비공식만 | Yes | 4/5 | 미구현(API없음) |
| **Nano Banana 2 (fal.ai)** | 4.5/5 | ~$0.06 | fal.ai | No | 4.5/5 | **구현 완료** |
| **IP-Adapter SDXL** | 3.5/5 | $0.02-0.03 | Replicate | Yes | 4/5 | **구현 완료** |
| **Flux 1.1 Pro** | 4/5 | $0.03-0.07 | Replicate | Yes | 4/5 | **구현 완료** |
| Flux 2 + LoRA (학습) | 5/5 | 학습$5-20 + $0.02/장 | fal.ai | 내장 | **5/5** | Phase 3 |
| Leonardo.ai | 4/5 | $0.02-0.05 | API있음 | Yes | 4/5 | 미구현 |
| **Pollinations.ai** | 2/5 | 무료 | URL기반 | No | 2/5 | **구현 완료(fallback)** |

### 핵심 인사이트 (2026년)
- **Flux 2**가 오픈소스 일관성 표준 (10장 멀티레퍼런스 네이티브)
- **Ideogram 3.0**이 독립 테스트에서 캐릭터 일관성 1위 (6라운드 전부 통과)
- **DALL-E 3 종료** (2026.05.12) → GPT Image 2로 전환 완료
- **Flux 2 + LoRA** = 캐릭터별 학습 후 가장 강력한 일관성
- **Sora 서비스 종료 예정** (2026년 내)

---

## 3. 영상 생성 + 캐릭터 유지

| 서비스 | 캐릭터유지 | 비용 | API | 일러스트 적합 |
|--------|-----------|------|-----|-------------|
| Runway Gen-4.5 | 5/5 | $12-95/월 | Yes | 4/5 |
| **Kling 3.0** | 5/5 | $6.99/월, $0.07/초 | fal.ai | **4/5** |
| Google Veo 3.1 | 4/5 | $7.99-249.99/월 | Yes | 3/5 |
| **Pika 2.5** | 3/5 | $8-28/월 | Yes | **5/5** (아동그림체 최적) |
| Luma Ray3 | 4/5 | $7.99/월~ | Yes | 3/5 |
| HunyuanVideo 1.5 | 4/5 | 오픈소스(GPU) | Yes | 4/5 |
| Wan 2.7 | 4/5 | 오픈소스 | Yes | 4/5 |
| **Ken Burns (현재)** | 5/5 | **무료** | 클라이언트 | **5/5** | **구현 완료** |

### 영상 캐릭터 유지 표준 방법 (2025-2026)
1. 일관된 캐릭터 삽화 이미지 생성 (Flux2/Ideogram)
2. Image-to-Video 모드로 첫 프레임에 고정
3. Kling 3.0 (가성비) 또는 Runway Gen-4.5 (품질)

---

## 4. API 플랫폼 비교

| 플랫폼 | 최저가격 | 강점 | 주요 모델 |
|--------|---------|------|----------|
| **fal.ai** | $0.002/img~ | 속도/가격/LoRA학습 | Flux 2, BiRefNet, Nano Banana |
| Replicate | $0.003/img~ | 문서화, 커뮤니티 | Flux, GPT Image, Imagen |
| OpenAI | $0.005/img~ | 텍스트렌더링, 편집 | GPT Image 2, 1.5, Mini |
| Ideogram | $0.0375/img~ | 캐릭터일관성, 텍스트 | Ideogram 3.0 |
| Together.ai | ~$0.04/img | 소규모팀 | Flux Pro |

---

## 5. 아동 그림 특화

### 스토리북 AI 플랫폼 현황
- **MyStoryBot**: 그림→캐릭터 고정→PDF/POD 인쇄
- **Story Sprout** (오픈소스): Flux-LoRA 컬러링북
- **Childbook.ai**: AI 스토리북, Canva 통합
- **Kids Art Studio** (iOS): 온디바이스 처리, $4.99

### 프롬프트 팁
- 항상 포함: `"cute", "child-friendly", "storybook"`
- 크레용: `"crayon drawing style, thick outlines, vibrant colors"`
- 색연필: `"colored pencil illustration, soft textures"`
- 스티커용: `"transparent background, no shadows, clean edges"`

### 굿즈 제작 경로
1. **스티커**: BiRefNet 배경제거 → 투명 PNG → Sticker Mule
2. **피규어**: 캐릭터 시트 생성 → Meshy.ai 3D모델링 → 3D프린팅
3. **캐릭터 시트**: Flux 2 + ControlNet OpenPose → 다각도 자동 생성

---

## 6. 현재 구현 상태

### 구현 완료 Provider (8개)

| Provider Key | 이름 | API Platform |
|-------------|------|-------------|
| `flux2_fal` | Flux 2 Pro | fal.ai |
| `flux_kontext` | Flux Kontext Pro | fal.ai |
| `ideogram3` | Ideogram 3.0 | ideogram.ai |
| `gpt_image2` | GPT Image 2 | OpenAI |
| `replicate_ip_adapter` | IP-Adapter SDXL | Replicate |
| `replicate_flux` | Flux 1.1 Pro | Replicate |
| `nano_banana_fal` | Nano Banana 2 | fal.ai |
| `pollinations` | Pollinations.ai | 무료 |

### 구현 완료 배경 제거 (2개)
- **rembg** (로컬, 무료)
- **BiRefNet** (fal.ai, ~$0.003/장)

### 구현 완료 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `backend/agents/character_agent.py` | 8개 provider + BiRefNet + PROVIDERS 메타데이터 |
| `backend/database/models.py` | Character, StoryCharacter 테이블 |
| `backend/config.py` | FAL_KEY, IDEOGRAM_API_KEY + 기존 키 |
| `backend/requirements.txt` | fal-client 추가 |
| `backend/main.py` | 캐릭터 CRUD + 실험 엔드포인트 4개 |
| `src/pages/character/index.js` | 캐릭터 갤러리 |
| `src/pages/character/extract.js` | 캐릭터 추출 UI |
| `src/pages/experiment.js` | **실험 대시보드** (Provider A/B 비교) |
| `src/services/api.js` | CharacterAPI 클라이언트 |
| `src/pages/story/storybook.js` | Ken Burns 영상 |
| `src/components/navbar.js` | 캐릭터 + 실험실 메뉴 |
| `src/main.js` | /characters, /character-extract, /experiment 라우트 |
| `src/style.css` | 캐릭터 + 실험실 스타일 |

### 실험 대시보드 기능
- `/experiment` 페이지에서 모든 provider 상태 확인
- API 키 설정 여부 실시간 표시
- 단일 provider 테스트 (이미지 1장 생성)
- 다중 provider A/B 비교 (체크박스 선택)
- 배경 제거 비교 (rembg vs BiRefNet)
- 캐릭터 참조 또는 직접 이미지 업로드

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/providers` | Provider 목록 + API 키 상태 |
| POST | `/api/experiment/single` | 단일 provider 생성 테스트 |
| POST | `/api/experiment/compare` | 다중 provider 비교 |
| POST | `/api/experiment/extract` | 배경 제거 비교 (rembg/birefnet) |
| POST | `/api/characters/extract` | 캐릭터 추출+분석+저장 |
| GET/DELETE | `/api/characters/{id}` | 캐릭터 CRUD |
| POST | `/api/generate-story-with-character` | 일관성 동화 생성 |

---

## 7. 비용 예시

### 8페이지 동화책 생성 비용

| 접근법 | 셋업 | 페이지당 | 8페이지 합계 |
|--------|------|---------|-------------|
| Flux 2 Pro (fal.ai) | $0 | $0.04 | **$0.32** |
| Flux Kontext | $0 | $0.06 | **$0.48** |
| Ideogram 3.0 | $0 | $0.06 | **$0.48** |
| Flux 2 + LoRA | $5-20(1회) | $0.02 | **$5-20 + $0.16** |
| GPT Image 2 Low | $0 | $0.005 | **$0.04** |
| Pollinations | $0 | $0 | **$0** |

### 캐릭터 1개 풀 파이프라인
- 배경 제거 (BiRefNet): ~$0.003
- LoRA 학습 (1회): ~$5-20
- 이미지 생성 (LoRA, 장당): ~$0.02
- 스토리북 10페이지: ~$0.20
- 영상 5초 (Kling): ~$0.35
- **초기 셋업 총비용: ~$5-25** | **이후 운영: ~$0.02-0.06/장**

---

## 8. Phase 로드맵

| Phase | 내용 | 상태 |
|-------|------|------|
| **Phase 1** | 8개 provider + 실험 대시보드 + 캐릭터 CRUD + Ken Burns | **완료** |
| Phase 2 | Flux 2 LoRA 학습 API + SAM3 정밀 추출 + 캐릭터 시트 생성 | 계획 |
| Phase 3 | Kling/Pika AI 영상 + TTS 합성 + 굿즈 에셋 내보내기 | 계획 |
| Phase 4 | 스티커/피규어 자동 생성 + SVG 트레이싱 + POD 연동 | 계획 |
