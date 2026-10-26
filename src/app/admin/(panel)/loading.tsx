export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-300" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />)}
      </div>
      <div className="card mt-6 h-64 animate-pulse bg-gray-100" />
    </div>
  );
}
