import { useState, useEffect } from 'react';
import { taxiparksAPI } from '../lib/api';
import TaxiParkCard from './TaxiParkCard';

const SORT_OPTIONS = [
  { key: 'rating', label: '⭐ Рейтинг', icon: 'bi-star-fill' },
  { key: 'likes_count', label: '❤️ Лайки', icon: 'bi-heart-fill' },
  { key: 'comments', label: '💬 Отзывы', icon: 'bi-chat-fill' },
  { key: 'views_count', label: '👁 Просмотры', icon: 'bi-eye-fill' },
];

export default function RatingList() {
  const [taxiparks, setTaxiparks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rating');
  const [transitioning, setTransitioning] = useState(false);

  const fetchTaxiparks = async (sort) => {
    setTransitioning(true);
    try {
      let params = { page_size: 20 };

      if (sort === 'comments') {
        params.sort_by = 'comments';
      } else {
        params.ordering = `-${sort}`;
      }

      const res = await taxiparksAPI.getList(params);
      const results = res.data.results || res.data;

      setTimeout(() => {
        setTaxiparks(results.slice(0, 20));
        setTransitioning(false);
        setLoading(false);
      }, 200);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setTransitioning(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxiparks(sortBy);
  }, [sortBy]);

  const handleSort = (sort) => {
    if (sort === sortBy) return;
    setLoading(true);
    setSortBy(sort);
  };

  return (
    <div>
      {/* Sort Controls */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <span className="text-muted fw-semibold me-2">Сортировка:</span>
        <div className="sort-btn-group d-flex flex-wrap gap-2">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleSort(opt.key)}
              className={`btn btn-sm ${
                sortBy === opt.key
                  ? 'btn-warning fw-bold shadow-sm'
                  : 'btn-outline-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div
        className="d-flex flex-column gap-3"
        style={{
          opacity: transitioning ? 0.4 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="taxi-card p-3">
              <div className="d-flex gap-3 align-items-center">
                <div className="placeholder-glow">
                  <span className="placeholder rounded-circle" style={{ width: 48, height: 48, display: 'block' }} />
                </div>
                <div className="flex-grow-1 placeholder-glow">
                  <span className="placeholder col-6 mb-2 d-block" />
                  <span className="placeholder col-10 small" />
                </div>
              </div>
            </div>
          ))
        ) : taxiparks.length > 0 ? (
          taxiparks.map((park, i) => (
            <TaxiParkCard
              key={park.id}
              taxipark={park}
              rank={i + 1}
            />
          ))
        ) : (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox fs-1 d-block mb-3"></i>
            <p>Нет данных для отображения</p>
          </div>
        )}
      </div>

      {/* Count info */}
      {!loading && taxiparks.length > 0 && (
        <p className="text-muted text-center small mt-4">
          Показано {taxiparks.length} таксопарков из рейтинга
        </p>
      )}
    </div>
  );
}