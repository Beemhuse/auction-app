export function PageHeader({ eyebrow, title, actions, children }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {children}
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </div>
  );
}
