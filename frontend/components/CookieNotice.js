import { useState, useEffect } from 'react';

export default function CookieNotice() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (consent === 'true') setAccepted(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div className="fixed-bottom alert alert-secondary">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          Мы используем куки и аналитику для улучшения работы сайта.
        </p>
        <button
          onClick={handleAccept}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
        >
          Принять
        </button>
      </div>
    </div>
  );
}