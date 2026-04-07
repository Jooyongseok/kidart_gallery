export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer__inner">
        <p className="footer__copy">© {year} Jooyongseok. Built with React + Vite.</p>
        <div className="footer__links">
          <a
            href="https://github.com/Jooyongseok"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a href="mailto:jys0207@example.com">Email</a>
        </div>
      </div>
    </footer>
  );
}
