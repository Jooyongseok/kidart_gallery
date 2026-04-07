export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero__inner">
        <p className="hero__greeting">Hello, world! 👋</p>
        <h1 className="hero__title">
          안녕하세요,<br />주용석입니다.
        </h1>
        <p className="hero__subtitle">
          AI / Computer Vision 연구와 풀스택 개발을 합니다.
          데이터로 의미를 만들고, 사용자에게 가치 있는 경험을 전달하는 것에 관심이 있습니다.
        </p>
        <div className="hero__cta">
          <a href="#projects" className="btn btn--primary">프로젝트 보기 →</a>
          <a href="#contact" className="btn btn--ghost">연락하기</a>
        </div>
      </div>
    </section>
  );
}
