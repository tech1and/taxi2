import Layout from '../components/Layout';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <Layout
      title="О нас — Рейтинг таксопарков Москвы"
      description="О проекте ТаксоРейтинг Москвы — независимый рейтинг лучших таксопарков столицы."
    >
      <div className="hero-section py-5">
        <div className="container">
          <h1 className="fw-black text-white">О проекте</h1>
          <p className="lead text-white-50">ТаксоРейтинг — независимый рейтинг таксопарков Москвы</p>
        </div>
      </div>
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-8">
            <div className="taxi-card p-4 mb-4">
              <h2 className="fw-bold mb-3">Наша миссия</h2>
              <p className="text-muted">
                Мы создаём прозрачный и честный рейтинг таксопарков Москвы, 
                помогая пассажирам делать обоснованный выбор. Все оценки формируются 
                на основе реальных отзывов пользователей.
              </p>
            </div>
            <div className="taxi-card p-4">
              <h2 className="fw-bold mb-3">Как работает рейтинг?</h2>
              <ol className="text-muted">
                <li className="mb-2">Пользователи оставляют отзывы о таксопарках</li>
                <li className="mb-2">Ставят лайки понравившимся таксопаркам</li>
                <li className="mb-2">Просматривают страницы — это также учитывается</li>
                <li className="mb-2">Алгоритм формирует итоговый рейтинг</li>
              </ol>
              <Link href="/" className="btn btn-warning mt-3">
                Смотреть рейтинг
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}