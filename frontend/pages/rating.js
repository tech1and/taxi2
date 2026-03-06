import Layout from '../components/Layout';
import RatingList from '../components/RatingList';

export default function RatingPage() {
  return (
    <Layout
      title="Рейтинг таксопарков Москвы 2024 — Топ-20"
      description="Полный рейтинг таксопарков Москвы. Сортировка по лайкам, отзывам и просмотрам."
    >
      <div className="hero-section py-5">
        <div className="container">
          <h1 className="fw-black text-white">
            <i className="bi bi-trophy-fill text-warning me-3"></i>
            Рейтинг таксопарков Москвы
          </h1>
          <p className="lead text-white-50">
            Топ-20 лучших таксопарков по мнению пользователей
          </p>
        </div>
      </div>

      <div className="container py-5">
        <RatingList />
      </div>
    </Layout>
  );
}