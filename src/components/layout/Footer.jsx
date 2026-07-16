import { ExternalLink } from 'lucide-react';

export default function Footer() {
  // Kept separate from App so shared layout chrome stays small and reusable.
  return (
    <div className="app-footer">
      <div className="footer-actions">
        <form action="https://www.instagram.com/zalman.tattoo/">
          <button className="button button-ghost">
            Instagram
            <ExternalLink size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
