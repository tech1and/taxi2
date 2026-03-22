import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Layout({ children, title, description, canonical, schema }) {
  useEffect(() => {
    require('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  const siteTitle = title
    ? `${title} | Рейтинг таксопарков Москвы`
    : 'Рейтинг таксопарков Москвы 2026 — лучшие таксопарки';

  const siteDescription = description ||
    'Рейтинг лучших таксопарков Москвы 2026. Читайте отзывы, сравнивайте цены и выбирайте лучшее такси.';

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        {canonical && <link rel="canonical" href={canonical} />}
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ru_RU" />
        <meta name="robots" content="index, follow" />
        <link rel="icon" href="/favicon.ico" />
        {schema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        )}
      </Head>

      <header>
        <nav className="navbar navbar-expand-lg navbar-dark" style={{ background: '#1a1a2e' }}>
          <div className="container">
            <Link href="/" className="navbar-brand d-flex align-items-center gap-2">
              <span className="taxi-icon">🚕</span>
              <span>ТаксоРейтинг</span>
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto gap-1">
                <li className="nav-item">
                  <Link href="/" className="nav-link px-3">
                    <i className="bi bi-house me-1"></i>Главная
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/rating" className="nav-link px-3">
                    <i className="bi bi-trophy me-1"></i>Рейтинг
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/blog" className="nav-link px-3">
                    <i className="bi bi-journal-text me-1"></i>Блог
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/about" className="nav-link px-3">
                    <i className="bi bi-info-circle me-1"></i>О нас
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="py-5 mt-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <h5 className="text-warning fw-bold mb-3">🚕 ТаксоРейтинг Москвы</h5>
              <p className="small">
                Независимый рейтинг таксопарков Москвы. Помогаем выбрать лучшее такси
                по соотношению цена/качество.
              </p>
            </div>
            <div className="col-lg-2">
              <h6 className="text-white mb-3">Навигация</h6>
              <ul className="list-unstyled small">
                <li><Link href="/">Главная</Link></li>
                <li><Link href="/rating">Рейтинг</Link></li>
                <li><Link href="/blog">Блог</Link></li>
                <li><Link href="/about">О нас</Link></li>
              </ul>
            </div>
            <div className="col-lg-3">
              <h6 className="text-white mb-3">Популярное</h6>
              <ul className="list-unstyled small">
                <li><Link href="/taxiparks/roolim">ROOLIM</Link></li>
                <li><Link href="/taxiparks/f1rst">F1RST</Link></li>
                <li><Link href="/taxiparks/prezident">Президент</Link></li>
                <li><Link href="/blog">Статьи о такси</Link></li>
              </ul>
            </div>
            <div className="col-lg-3">
              <h6 className="text-white mb-3">Контакты</h6>
              <ul className="list-unstyled small">
                <li><i className="bi bi-envelope me-2"></i>info@taxorating.ru</li>
                <li className="mt-2">
                  <i className="bi bi-geo-alt me-2"></i>Москва, Россия
                </li>
              </ul>
            </div>
          </div>
          <hr className="border-secondary mt-4" />
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
            <p className="small mb-0">
              © {new Date().getFullYear()} ТаксоРейтинг Москвы. Все права защищены.
            </p>
            <p className="small mb-0">
              <Link href="/privacy">Политика конфиденциальности</Link>
              {' · '}
              <Link href="/sitemap">Карта сайта</Link>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}