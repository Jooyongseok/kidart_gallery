# 3D Gallery Module
**Last Updated**: 2026-04-03

## 현재 상태: ✅ 작동 / 개선 중

Three.js 기반 1인칭 3D 갤러리. WASD 이동 + PointerLock 카메라로 미술관 탐험.

---

## 파일 맵
| 파일 | 역할 | 주요 export |
|------|------|-------------|
| `index.js` | 진입점, init/cleanup, HTML 렌더 | `renderGallery3D()` |
| `state.js` | 공유 상태, 충돌 헬퍼 | `s`, `addCollider()`, `checkCollision()` |
| `templates.js` | 갤러리 템플릿 정의 (7개) | `GALLERY_TEMPLATES` |
| `scene.js` | 방 건축, 조명, 템플릿별 장식 | `buildGallery(T)` |
| `player.js` | 이동, 카메라, 키입력, 렌더루프 | `setupInputs()`, `animate()` |
| `artworks.js` | 벽면 작품 배치, 조각, 팝업 | `placeArtworks()`, `placePedestals()` |

## 템플릿 목록 (templates.js)
| Key | 이름 | 규모 (W x D x H) | 특징 |
|-----|------|-------------------|------|
| `modern-white` | 모던 화이트 | 20x25x6 | 밝은 현대 미술관, 파티션+기둥 |
| `dark-luxury` | 다크 럭셔리 | 22x28x6 | 어두운 VIP 갤러리, 골드 액센트 |
| `kids-colorful` | 키즈 컬러풀 | 18x22x4.5 | 알록달록 무지개, 별+큐브 장식 |
| `louvre` | 루브르 클래식 | 28x38x9 | 궁전형 대공간, 기둥 행렬, 아치 |
| `tate-modern` | 테이트 인더스트리얼 | 32x42x12 | 산업형 대형홀, 철골 빔, 콘크리트 |
| `guggenheim` | 구겐하임 스파이럴 | 24x32x8 | 곡선 램프, 스카이라이트 링 |
| `outdoor` | 야외 조각공원 | 26x36x6 | 잔디+나무, 태양광, 오픈에어 |

## 템플릿 추가 규칙
1. `templates.js`의 `GALLERY_TEMPLATES`에 객체 추가
2. 스키마: `{ name, icon, description, room, colors, fog, moveSpeed, lighting, hasPedestals, ... }`
3. 템플릿별 장식은 `scene.js`의 `buildTemplateDecorations()` 안에 `if (key === 'my-key')` 블록 추가
4. 템플릿별 조명은 `scene.js`의 `addLighting()` 하단에 동일 패턴

## 충돌 추가 규칙
- 새 오브젝트에 충돌 필요 시: `addCollider(minX, maxX, minZ, maxZ)` 호출
- AABB 기반, 축 분리 충돌 (미끄럼 효과)

---

## 다음 태스크
- [ ] 갤러리 규모 S/M/L 슬라이더 (scaleMultiplier → buildRoom)
- [ ] 미니맵 (우하단 탑뷰 canvas)
- [ ] 작품 hover 하이라이트 (raycaster mousemove → emissive)
- [ ] 입장 fade-in 트랜지션
- [ ] 실제 작품 이미지 로드 (DB 연동 후)
- [ ] 모바일 터치 조이패드
