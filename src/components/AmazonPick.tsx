/** Amazon Associates card (tag possjonah-20) + required disclosure. Sits under the main search/results area. */
export function AmazonPick() {
  return (
    <aside className="amazon-card-wrap" aria-label="Pill organizers on Amazon">
      <div className="amazon-card">
        <p className="amazon-card-head">Keep doses sorted</p>
        <a className="amazon-btn" href="https://www.amazon.com/s?k=pill+organizer&tag=possjonah-20" target="_blank" rel="sponsored noopener">Shop pill organizers on Amazon</a>
      </div>
      <p className="amazon-disclosure">As an Amazon Associate I earn from qualifying purchases.</p>
    </aside>
  );
}
