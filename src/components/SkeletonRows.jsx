export default function SkeletonRows({ count = 4 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton-bar" style={{ width: `${55 + (i % 3) * 10}%` }} />
          <div className="skeleton-bar" style={{ width: '60px' }} />
          <div className="skeleton-bar" style={{ width: '40px' }} />
        </div>
      ))}
    </div>
  )
}
