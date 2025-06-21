export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold mb-4 text-center">
        Welcome to the BBQ Contest Judging App
      </h1>
      <p className="text-lg text-gray-700 mb-8 text-center max-w-xl">
        This is the official platform for managing teams, items, judges, and
        live scoring for your BBQ contest event.
      </p>
      <a
        href="/login"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
      >
        Admin / Judge Login
      </a>
    </div>
  );
}
