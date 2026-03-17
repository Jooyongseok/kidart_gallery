// ============================================================
// Sample Data — Artists & Artworks
// ============================================================

// Procedural color generator for placeholders
function generatePlaceholderColor(seed) {
  const hues = [340, 260, 200, 160, 30, 45, 300, 180];
  return `hsl(${hues[seed % hues.length]}, 65%, 55%)`;
}

export const artists = [
  {
    id: 'artist-1',
    name: '김하늘',
    age: 7,
    emoji: '🎨',
    bio: '색감이 뛰어난 꼬마 화가. 자연과 동물을 주로 그립니다.',
    artworks: [
      { id: 'a1-1', title: '무지개 나라', description: '무지개 위를 걸어가는 상상 속 세계', date: '2026-01-15', color: '#7c5cfc' },
      { id: 'a1-2', title: '바다 속 친구들', description: '깊은 바다에서 만난 물고기 친구들', date: '2026-02-03', color: '#38bdf8' },
      { id: 'a1-3', title: '봄날의 정원', description: '꽃이 만발한 아름다운 정원', date: '2026-03-01', color: '#34d399' },
      { id: 'a1-4', title: '별이 빛나는 밤', description: '반짝이는 별들이 가득한 밤하늘', date: '2026-03-10', color: '#a78bfa' },
    ]
  },
  {
    id: 'artist-2',
    name: '이서준',
    age: 8,
    emoji: '🖌️',
    bio: '공룡과 로봇을 좋아하는 상상력 가득한 어린이.',
    artworks: [
      { id: 'a2-1', title: '로봇 왕국', description: '로봇들이 살고 있는 미래 도시', date: '2026-01-20', color: '#f472b6' },
      { id: 'a2-2', title: '공룡 대모험', description: '거대한 공룡과 함께하는 모험', date: '2026-02-14', color: '#fb923c' },
      { id: 'a2-3', title: '우주 탐험', description: '우주선을 타고 떠나는 신나는 여행', date: '2026-03-05', color: '#818cf8' },
    ]
  },
  {
    id: 'artist-3',
    name: '박소율',
    age: 6,
    emoji: '✏️',
    bio: '동물과 자연을 사랑하며, 따뜻한 그림을 그리는 아이.',
    artworks: [
      { id: 'a3-1', title: '고양이 가족', description: '귀여운 고양이 가족의 행복한 하루', date: '2026-01-10', color: '#f9a8d4' },
      { id: 'a3-2', title: '마법의 숲', description: '요정들이 사는 신비한 숲', date: '2026-02-25', color: '#6ee7b7' },
      { id: 'a3-3', title: '무지개 케이크', description: '알록달록 무지개 색상의 거대한 케이크', date: '2026-03-08', color: '#fbbf24' },
      { id: 'a3-4', title: '꽃밭에서', description: '화사한 꽃밭에서 놀고 있는 토끼', date: '2026-03-12', color: '#fb7185' },
      { id: 'a3-5', title: '겨울왕국', description: '눈이 소복이 쌓인 겨울 나라', date: '2026-02-01', color: '#93c5fd' },
    ]
  },
  {
    id: 'artist-4',
    name: '최도현',
    age: 9,
    emoji: '🎭',
    bio: '만화와 캐릭터 디자인에 관심이 많은 미래의 일러스트레이터.',
    artworks: [
      { id: 'a4-1', title: '슈퍼히어로', description: '하늘을 나는 나만의 히어로 캐릭터', date: '2026-01-25', color: '#ef4444' },
      { id: 'a4-2', title: '해적선 모험', description: '보물을 찾아 떠나는 해적선 이야기', date: '2026-02-20', color: '#d97706' },
      { id: 'a4-3', title: '용과 기사', description: '용감한 기사와 착한 용의 우정', date: '2026-03-03', color: '#059669' },
    ]
  },
  {
    id: 'artist-5',
    name: '정예은',
    age: 7,
    emoji: '🌈',
    bio: '파스텔 톤의 부드러운 그림을 그리며, 동화적인 세계관을 가진 아이.',
    artworks: [
      { id: 'a5-1', title: '구름 나라', description: '구름 위에서 살고 있는 작은 마을', date: '2026-01-30', color: '#c4b5fd' },
      { id: 'a5-2', title: '꿈의 놀이공원', description: '상상 속 환상적인 놀이공원', date: '2026-02-10', color: '#fda4af' },
      { id: 'a5-3', title: '달님과 별님', description: '달과 별이 함께 노는 밤하늘', date: '2026-03-07', color: '#fcd34d' },
      { id: 'a5-4', title: '인어공주의 바다', description: '반짝이는 보석으로 가득한 바닷속 궁전', date: '2026-03-14', color: '#67e8f9' },
    ]
  },
  {
    id: 'artist-6',
    name: '한지우',
    age: 8,
    emoji: '🖍️',
    bio: '크레파스와 색연필로 독특한 패턴과 추상화를 그리는 천재.',
    artworks: [
      { id: 'a6-1', title: '소용돌이', description: '다채로운 색상의 소용돌이 추상화', date: '2026-02-05', color: '#a855f7' },
      { id: 'a6-2', title: '도시의 밤', description: '화려한 네온사인이 빛나는 야경', date: '2026-02-28', color: '#3b82f6' },
      { id: 'a6-3', title: '음악이 보여요', description: '음표와 멜로디를 색으로 표현한 그림', date: '2026-03-11', color: '#ec4899' },
    ]
  }
];

export function getArtistById(id) {
  return artists.find(a => a.id === id);
}

export function getAllArtworks() {
  return artists.flatMap(artist =>
    artist.artworks.map(art => ({
      ...art,
      artistId: artist.id,
      artistName: artist.name,
      artistEmoji: artist.emoji
    }))
  );
}

export function generatePlaceholderImage(color, title) {
  // Creates a canvas-based placeholder image
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 400, 300);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shiftHue(color, 40));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 300);

  // Decorative shapes
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(
      80 + Math.sin(i * 1.5) * 150,
      60 + Math.cos(i * 1.2) * 100,
      30 + i * 15,
      0, Math.PI * 2
    );
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // Title text
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText(title, 200, 150);

  return canvas.toDataURL('image/png');
}

function shiftHue(hex, amount) {
  // Simple hue shift for gradient effect
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount / 2);
  return `rgb(${r}, ${g}, ${b})`;
}
