type Props = { compact?: boolean }

export function Disclaimer({ compact }: Props) {
  if (compact) {
    return (
      <p className="disclaimer-banner" role="note">
        <strong>Not medical advice.</strong> Educational info from public sources only.
        Talk to a clinician or pharmacist about your health.
      </p>
    )
  }

  return (
    <aside className="disclaimer-card" role="note">
      <h2>Important</h2>
      <p>
        <strong>Med Pal is not medical advice</strong> and does not replace a doctor,
        pharmacist, or emergency care. We show publicly available labeling and news —
        we do <em>not</em> give dosing, diagnoses, or treatment recommendations.
      </p>
      <p>
        If you think you are having a medical emergency, call your local emergency
        number right away.
      </p>
    </aside>
  )
}
