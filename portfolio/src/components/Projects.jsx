const PROJECTS = [
  {
    icon: '🎨',
    title: 'KidArt Gallery',
    description:
      '어린이 미술 작품을 감상하는 Three.js 3D 갤러리 + Claude 멀티 에이전트 백엔드. ' +
      '7개 미술관 테마(루브르, 테이트, 구겐하임 등)와 AI 동화 생성 파이프라인을 갖춘 풀스택 프로젝트입니다.',
    tags: ['Three.js', 'Vanilla JS', 'FastAPI', 'Claude API', 'SQLAlchemy'],
    github: 'https://github.com/Jooyongseok/kidart_gallery',
    demo: null,
  },
  {
    icon: '🧬',
    title: 'RNA Cancer Classification',
    description:
      'RNA gene expression 데이터에서 12종 암을 분류하는 머신러닝 파이프라인. ' +
      '다양한 feature selection 기법(LR, MI, PLS, RF) 비교 + TabPFN 스태킹 앙상블.',
    tags: ['Python', 'PyTorch', 'TabPFN', 'scikit-learn', 'Bioinformatics'],
    github: null,
    demo: null,
  },
];

export default function Projects() {
  return (
    <section className="section" id="projects">
      <h2 className="section__title">Projects</h2>
      <p className="section__subtitle">최근 작업 중인 것들</p>

      <div className="projects__grid">
        {PROJECTS.map(p => (
          <article key={p.title} className="project-card">
            <div className="project-card__cover">{p.icon}</div>
            <div className="project-card__body">
              <h3 className="project-card__title">{p.title}</h3>
              <p className="project-card__desc">{p.description}</p>
              <div className="project-card__tags">
                {p.tags.map(t => (
                  <span key={t} className="project-card__tag">{t}</span>
                ))}
              </div>
              <div className="project-card__links">
                {p.github && (
                  <a
                    href={p.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-card__link"
                  >
                    GitHub →
                  </a>
                )}
                {p.demo && (
                  <a
                    href={p.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-card__link"
                  >
                    Live Demo →
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
