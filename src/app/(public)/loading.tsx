export default function Loading() {
  return (
    <div className="container-x py-12" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-72 animate-pulse bg-gray-100" />)}
      </div>
    </div>
  );
}
