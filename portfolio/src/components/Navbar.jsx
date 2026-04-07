export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <a href="#home" className="navbar__logo">Jooyongseok</a>
        <ul className="navbar__links">
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </div>
    </nav>
  );
}
