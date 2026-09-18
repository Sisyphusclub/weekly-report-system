export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-caption-1-semibold uppercase tracking-[0.08em] text-accent-600">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-title-1-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 max-w-2xl text-body-regular text-text-secondary">
        {description}
      </p>
    </header>
  );
}
