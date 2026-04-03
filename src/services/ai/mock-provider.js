// ============================================================
// Mock AI Provider — Demo Implementation
// ============================================================
// Simulates AI responses with delays and generated content.
// Replace this with a real provider (OpenAI, Stability AI, etc.)
// by extending AIServiceProvider.
// ============================================================

import { AIServiceProvider } from './ai-provider.js';

export class MockAIProvider extends AIServiceProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'MockAI (데모)';
  }

  async generateStory(imageData, options = {}) {
    await this._simulateDelay(2000);

    const stories = [
      {
        title: '무지개 너머의 모험',
        story: `옛날 옛날, 작은 마을에 호기심 가득한 아이가 살았습니다.

어느 날, 하늘에 아름다운 무지개가 나타났어요. 아이는 무지개 끝에 무엇이 있는지 궁금해서 모험을 떠나기로 했습니다.

"무지개 너머에는 뭐가 있을까?" 아이는 설레는 마음으로 걸어갔어요.

무지개 다리를 건너자 버블버블 아름다운 구름 나라가 나타났습니다! 
구름으로 만든 집들, 솜사탕 같은 나무들, 그리고 반짝반짝 빛나는 별 친구들이 아이를 반겨주었어요.

"환영해! 여기는 꿈의 나라야!" 별 친구가 말했습니다.

아이는 별 친구들과 함께 구름 위에서 신나게 놀았어요. 
미끄럼틀을 타고, 구름 점프를 하고, 별빛 그림도 그렸답니다.

해가 질 무렵, 아이는 집으로 돌아왔어요.
"오늘 정말 멋진 하루였어!" 아이는 행복하게 잠이 들었답니다.

— 끝 —`
      },
      {
        title: '마법 물감 이야기',
        story: `작은 화가 민지는 특별한 물감 세트를 발견했어요.

"이 물감으로 그림을 그리면 그림이 살아난대!" 
상자에 적힌 글씨를 읽고 민지는 깜짝 놀랐습니다.

빨간 물감으로 사과를 그리자, 탐스러운 사과가 쏙! 종이 밖으로 나왔어요.
파란 물감으로 하늘을 칠하자, 방구석에 맑고 화창한 하늘이 펼쳐졌습니다.

"와, 정말 마법 물감이다!"

민지는 초록 나무와 노란 해바라기, 분홍 꽃들을 그렸어요.
어느새 민지의 방은 아름다운 정원이 되었습니다.

마지막으로 민지는 웃고 있는 친구들을 그렸어요.
그러자 친구들이 나타나 함께 정원에서 놀기 시작했답니다!

"친구들과 함께하니까 더 행복해!" 

민지는 매일 새로운 그림을 그려, 
세상을 더 아름답게 만들었답니다. 🎨

— 끝 —`
      }
    ];

    const chosen = stories[Math.floor(Math.random() * stories.length)];
    const pages = chosen.story.split('\n\n').filter(p => p.trim());
    return {
      title: chosen.title,
      story: chosen.story,
      pages,
      illustrations: pages.map(() => null),
    };
  }

  async generateAnimation(imageData, options = {}) {
    await this._simulateDelay(3000);

    // Generate simple CSS animation keyframes as a demo
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const frames = [];
    const totalFrames = 8;

    for (let i = 0; i < totalFrames; i++) {
      ctx.clearRect(0, 0, 400, 300);

      // Animated background
      const hue = (i * 45) % 360;
      const grad = ctx.createRadialGradient(200, 150, 20 + i * 10, 200, 150, 200);
      grad.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
      grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 30%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 300);

      // Moving elements
      const x = 50 + (i * 40);
      const y = 150 + Math.sin(i * 0.8) * 40;

      // Star
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(i * 0.3);
      drawStar(ctx, 0, 0, 5, 20, 10);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.restore();

      // Floating circles
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.arc(
          100 + j * 60 + Math.sin(i + j) * 20,
          80 + Math.cos(i + j) * 30,
          8 + j * 2,
          0, Math.PI * 2
        );
        ctx.fillStyle = `hsla(${hue + j * 30}, 70%, 70%, 0.6)`;
        ctx.fill();
      }

      frames.push(canvas.toDataURL('image/png'));
    }

    return {
      frames,
      preview: frames[0]
    };
  }

  async convert2Dto3D(imageData, options = {}) {
    await this._simulateDelay(2500);

    // Return simulated 3D mesh data
    return {
      modelData: {
        type: 'preview-3d',
        description: '3D 변환 미리보기 (데모)',
        vertices: 1200,
        faces: 2400,
        format: 'OBJ'
      },
      preview: imageData, // Reuse input as preview
      meshInfo: {
        width: 10,
        height: 7.5,
        depth: 2,
        materialType: 'textured',
        note: '실제 AI 서비스 연결 시 실제 3D 모델이 생성됩니다.'
      }
    };
  }

  async _simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}
