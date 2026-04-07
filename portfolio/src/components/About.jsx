const SKILLS = [
  'Python', 'PyTorch', 'TensorFlow', 'Computer Vision',
  'FastAPI', 'SQLAlchemy', 'PostgreSQL',
  'JavaScript', 'React', 'Vite', 'Three.js',
  'Docker', 'Linux', 'Git',
];

export default function About() {
  return (
    <section className="section" id="about">
      <h2 className="section__title">About Me</h2>
      <p className="section__subtitle">제가 어떤 사람이고, 무엇을 만들고 있는지</p>

      <div className="about__grid">
        <div className="about__avatar">JYS</div>
        <div className="about__text">
          <p>
            안녕하세요. 저는 RNA 기반 암 분류 연구와 멀티모달 AI 시스템 개발을 함께 하고 있는 연구자/개발자입니다.
            의료 데이터에서 의미 있는 패턴을 찾는 일과, 그 결과를 사람들이 직관적으로 사용할 수 있는
            웹 서비스로 풀어내는 일 모두에 관심이 있습니다.
          </p>
          <p>
            최근에는 Claude 기반 멀티 에이전트 백엔드, Three.js 3D 갤러리, FastAPI 마이크로서비스 같은
            풀스택 프로젝트를 진행하면서 AI 도구를 적극적으로 활용해 빠르게 프로토타입을 만드는 방식에
            많은 시간을 쏟고 있습니다.
          </p>
          <p>
            <strong>관심 분야:</strong> 의료 영상 / 게놈 데이터 / 멀티 에이전트 시스템 / 인터랙티브 3D 시각화
          </p>

          <div className="about__skills">
            <h3>Skills</h3>
            <div className="skill-chips">
              {SKILLS.map(skill => (
                <span key={skill} className="skill-chip">{skill}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
