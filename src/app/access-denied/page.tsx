export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-2 border-blue-300 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-blue-600 mb-2">Accès non autorisé</h1>
          <p className="text-gray-600">
            L&apos;application est accessible uniquement :
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="font-medium text-blue-700">📅 Du lundi au vendredi</p>
            <p className="font-medium text-blue-700">🕐 De 7h30 à 18h00</p>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Veuillez réessayer pendant les horaires autorisés.
          </p>
        </div>
        <a
          href="/login"
          className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retour à la connexion
        </a>
      </div>
    </div>
  );
}
