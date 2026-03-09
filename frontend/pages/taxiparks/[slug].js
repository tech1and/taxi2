import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import LikeButton from '../../components/LikeButton';
import CommentForm from '../../components/CommentForm';
import Link from 'next/link';
import { useState } from 'react';
import { taxiparksAPI } from '../../lib/api';

export default function TaxiParkPage({ taxipark, error }) {
  const router = useRouter();
  const [comments, setComments] = useState(taxipark?.comments || []);

  if (router.isFallback) {
    return (
      <Layout title="Загрузка...">
        <div className="loading-overlay">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !taxipark) {
    return (
      <Layout title="Страница не найдена">
        <div className="container py-5 text-center">
          <div style={{ fontSize: '4rem' }}>😞</div>
          <h1 className="mt-3">Таксопарк не найден</h1>
          <p className="text-muted">Возможно, страница была удалена или перемещена.</p>
          <Link href="/" className="btn btn-warning mt-3">На главную</Link>
        </div>
      </Layout>
    );
  }

  const handleCommentAdded = (newComment) => {
    setComments(prev => [newComment, ...prev]);
  };

  const features = [
    taxipark.has_children_seat && { icon: '👶', label: 'Детское кресло' },
    taxipark.has_animal_transport && { icon: '🐕', label: 'Перевозка животных' },
    taxipark.has_cargo && { icon: '📦', label: 'Грузовые перевозки' },
    taxipark.has_minivan && { icon: '🚐', label: 'Минивэн' },
  ].filter(Boolean);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://taxorating.ru';
  const canonical = `${siteUrl}/taxiparks/${taxipark.slug}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": "Рейтинг таксопарков", "item": `${siteUrl}/rating` },
      { "@type": "ListItem", "position": 3, "name": taxipark.name, "item": canonical },
    ],
  };

  const combinedSchema = [taxipark.schema_org, breadcrumbSchema];

  return (
    <Layout
      title={taxipark.meta_title}
      description={taxipark.meta_description}
      canonical={canonical}
      schema={combinedSchema}
    >
      {/* Breadcrumb */}
      <div className="breadcrumb-section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item">
                <Link href="/">Главная</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/rating">Рейтинг таксопарков</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {taxipark.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: 'white' }} className="py-5">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-auto">
              <div
                className="bg-white rounded-3 d-flex align-items-center justify-content-center"
                style={{ width: 96, height: 96 }}
              >
                {taxipark.logo ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${taxipark.logo}`}
                    alt={taxipark.name}
                    className="rounded-3"
                    style={{ width: 88, height: 88, objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '3rem' }}>🚕</span>
                )}
              </div>
            </div>
            <div className="col">
              <div className="d-flex flex-wrap gap-2 mb-2">
                <span className="rating-badge">
                  <i className="bi bi-star-fill"></i>
                  {Number(taxipark.rating).toFixed(1)}
                </span>
                {taxipark.district && (
                  <span className="badge bg-white bg-opacity-25">
                    <i className="bi bi-geo-alt-fill me-1"></i>
                    {taxipark.district}, Москва
                  </span>
                )}
              </div>
              <h1 className="fw-black fs-2 mb-2">{taxipark.name}</h1>
              <p className="mb-0 opacity-75">{taxipark.short_description}</p>
            </div>
            <div className="col-auto d-none d-md-block">
              <LikeButton
                slug={taxipark.slug}
                initialLikes={taxipark.likes_count}
                initialLiked={taxipark.user_liked}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-4">
          {/* Main Content */}
          <div className="col-lg-8">
            {/* Stats */}
            <div className="taxi-card mb-4">
              <div className="row g-0 text-center">
                <div className="col-4 stat-item border-end">
                  <div className="stat-value text-danger">
                    {taxipark.likes_count?.toLocaleString('ru')}
                  </div>
                  <div className="stat-label">Лайков</div>
                </div>
                <div className="col-4 stat-item border-end">
                  <div className="stat-value text-primary">
                    {taxipark.comments_count?.toLocaleString('ru')}
                  </div>
                  <div className="stat-label">Отзывов</div>
                </div>
                <div className="col-4 stat-item">
                  <div className="stat-value text-success">
                    {taxipark.views_count?.toLocaleString('ru')}
                  </div>
                  <div className="stat-label">Просмотров</div>
                </div>
              </div>
            </div>

            {/* Like Button Mobile */}
            <div className="d-md-none mb-4">
              <LikeButton
                slug={taxipark.slug}
                initialLikes={taxipark.likes_count}
                initialLiked={taxipark.user_liked}
              />
            </div>

            {/* Description */}
            <div className="taxi-card p-4 mb-4">
              <h2 className="h5 fw-bold mb-3">
                <i className="bi bi-info-circle text-primary me-2"></i>
                О таксопарке
              </h2>
              <div
                className="text-muted"
                style={{ lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: taxipark.description.replace(/\n/g, '<br>') }}
              />
            </div>

            {/* Features */}
            {features.length > 0 && (
              <div className="taxi-card p-4 mb-4">
                <h2 className="h5 fw-bold mb-3">
                  <i className="bi bi-check2-circle text-success me-2"></i>
                  Возможности
                </h2>
                <div className="d-flex flex-wrap gap-2">
                  {features.map(f => (
                    <span key={f.label} className="feature-badge">
                      {f.icon} {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {taxipark.latitude && taxipark.longitude && (
              <div className="taxi-card p-4 mb-4">
                <h2 className="h5 fw-bold mb-3">
                  <i className="bi bi-map text-info me-2"></i>
                  Местоположение
                </h2>
                <div className="map-placeholder">
                  <div className="text-center">
                    <i className="bi bi-geo-alt-fill fs-1 text-danger d-block mb-2"></i>
                    <strong>{taxipark.address}</strong>
                    <br />
                    <small className="text-muted">
                      {taxipark.district && `${taxipark.district}, `}{taxipark.city}
                    </small>
                    <br />
                    <a
                      href={`https://maps.yandex.ru/?text=${encodeURIComponent(taxipark.address || taxipark.name + ' Москва')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary mt-3"
                    >
                      <i className="bi bi-map-fill me-1"></i>
                      Открыть на Яндекс.Картах
                    </a>
                  </div>
                </div>
                {/* Для реального GEO — мета-теги уже в head */}
                <div className="mt-2 small text-muted">
                  <i className="bi bi-crosshair me-1"></i>
                  Координаты: {taxipark.latitude}, {taxipark.longitude}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="taxi-card p-4 mb-4">
              <h2 className="h5 fw-bold mb-4">
                <i className="bi bi-chat-quote text-warning me-2"></i>
                Отзывы ({comments.length})
              </h2>

              {comments.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-chat-dots fs-2 d-block mb-2"></i>
                  <p>Пока нет отзывов. Будьте первым!</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3 mb-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="border rounded-3 p-3 bg-light">
                      <div className="d-flex align-items-start justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-warning d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: 36, height: 36, fontSize: '0.85rem' }}
                          >
                            {comment.author_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <strong className="small">{comment.author_name}</strong>
                            <div className="small text-muted">
                              {new Date(comment.created_at).toLocaleDateString('ru-RU', {
                                year: 'numeric', month: 'long', day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <div>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <i
                              key={i}
                              className={`bi bi-star-fill small ${i < comment.rating ? 'text-warning' : 'text-muted'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mb-0 small">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <CommentForm
                slug={taxipark.slug}
                onCommentAdded={handleCommentAdded}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            {/* Info Card */}
            <div className="taxi-card p-4 mb-4 position-sticky" style={{ top: 20 }}>
              <h3 className="h6 fw-bold mb-3 text-muted text-uppercase" style={{ letterSpacing: 1 }}>
                Информация
              </h3>

              <ul className="list-unstyled">
                {taxipark.phone && (
                  <li className="mb-3">
                    <div className="small text-muted mb-1">Телефон</div>
                    <a href={`tel:${taxipark.phone}`} className="fw-semibold text-dark text-decoration-none">
                      <i className="bi bi-telephone-fill text-success me-2"></i>
                      {taxipark.phone}
                    </a>
                  </li>
                )}

                {taxipark.website && (
                  <li className="mb-3">
                    <div className="small text-muted mb-1">Сайт</div>
                    <a
                      href={taxipark.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="fw-semibold text-primary text-decoration-none"
                    >
                      <i className="bi bi-globe me-2"></i>
                      {taxipark.website.replace(/https?:\/\//i, '').slice(0, 30)}
                    </a>
                  </li>
                )}

                {taxipark.address && (
                  <li className="mb-3">
                    <div className="small text-muted mb-1">Адрес</div>
                    <span className="fw-semibold">
                      <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                      {taxipark.address}
                    </span>
                  </li>
                )}

                {taxipark.working_hours && (
                  <li className="mb-3">
                    <div className="small text-muted mb-1">Часы работы</div>
                    <span className="fw-semibold">
                      <i className="bi bi-clock-fill text-info me-2"></i>
                      {taxipark.working_hours}
                    </span>
                  </li>
                )}
              </ul>

              {/* Pricing */}
              {(taxipark.min_price || taxipark.price_per_km) && (
                <>
                  <hr />
                  <h3 className="h6 fw-bold mb-3 text-muted text-uppercase" style={{ letterSpacing: 1 }}>
                    Тарифы
                  </h3>
                  <div className="d-flex flex-column gap-2">
                    {taxipark.min_price && (
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="small text-muted">Минимальная стоимость</span>
                        <span className="badge bg-success fs-6">от {taxipark.min_price} ₽</span>
                      </div>
                    )}
                    {taxipark.price_per_km && (
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="small text-muted">Цена за км</span>
                        <span className="badge bg-primary fs-6">{taxipark.price_per_km} ₽/км</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* CTA */}
              {taxipark.website && (
                <a
                  href={taxipark.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn btn-warning w-100 fw-bold mt-4"
                >
                  <i className="bi bi-box-arrow-up-right me-2"></i>
                  Перейти на сайт
                </a>
              )}

              {taxipark.phone && (
                <a
                  href={`tel:${taxipark.phone}`}
                  className="btn btn-outline-success w-100 fw-bold mt-2"
                >
                  <i className="bi bi-telephone me-2"></i>
                  Позвонить
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const res = await taxiparksAPI.getDetail(params.slug);
    return {
      props: {
        taxipark: res.data,
      },
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { notFound: true };
    }
    return {
      props: {
        taxipark: null,
        error: 'Ошибка загрузки данных',
      },
    };
  }
}