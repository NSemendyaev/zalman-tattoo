export default function Footer() {
  // The footer reuses the same visual nav style as the header while keeping the
  // social/contact buttons in one small, predictable component.
  return (
    <div className="app-footer">
      <div className="footer-actions">
        <form action="https://www.instagram.com/zalman.tattoo/">
          <button className="button button-ghost">Instagram</button>
        </form>
      </div>
    </div>
  );
}
