type Props = {
  slot: 'header' | 'in-feed'
  className?: string
}

/** AdSense-ready placeholder. Wire real units later via data-ad-slot. */
export function AdSlot({ slot, className = '' }: Props) {
  const label = slot === 'header' ? 'Advertisement — header' : 'Advertisement — in feed'
  return (
    <aside
      className={`ad-slot ad-slot--${slot} ${className}`.trim()}
      aria-label={label}
      data-ad-slot={slot}
      data-ad-ready="placeholder"
    >
      <span className="ad-slot__badge">Ad</span>
      <span className="ad-slot__copy">Free · supported by sponsors</span>
    </aside>
  )
}
