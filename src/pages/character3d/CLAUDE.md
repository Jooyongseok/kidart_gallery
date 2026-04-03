# Character 3D Module (캐릭터 3D 변환)
**Last Updated**: 2026-04-03

## 현재 상태: ❌ 미구현

어린이 그림에서 캐릭터를 추출 → Three.js 3D 객체로 변환하는 기능.
현재 `ai-studio.js`의 2D→3D 탭에 Mock UI만 존재.

---

## 아키텍처 계획
```
그림 이미지 입력
  → 윤곽선/실루엣 추출 (Canvas 2D → edge detection or backend CV)
  → Three.js ExtrudeGeometry로 3D 메시 생성
  → 재질/색상 원본에서 샘플링
  → 3D 뷰어에서 회전/확대 가능
  → (선택) 갤러리에 조각상으로 배치
```

## 관련 파일
| 파일 | 역할 |
|------|------|
| `src/pages/ai-studio.js` | 2D→3D 탭 UI (Mock: OBJ 메시 정보 반환) |
| `src/services/ai/mock-provider.js` | `generate3DModel()` Mock 데이터 |

---

## 다음 태스크
- [ ] MVP 설계: 윤곽선 추출 방식 결정 (frontend Canvas vs backend CV)
- [ ] Three.js ExtrudeGeometry 프로토타입
- [ ] 3D 뷰어 컴포넌트 (OrbitControls)
- [ ] 갤러리 조각상으로 내보내기 연동
