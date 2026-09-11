export const HELP_PAL_COLLECTION_URL = "https://help-pal-apps.com/our-app-collection";

type Props = {
  className?: string;
};

/** Subtle footer/about link back to the Help-Pal app collection. */
export function HelpPalLink({ className = "" }: Props) {
  return (
    <p className={className ? `help-pal-link ${className}` : "help-pal-link"}>
      <a
        href={HELP_PAL_COLLECTION_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        More apps from Help-Pal
      </a>
    </p>
  );
}
