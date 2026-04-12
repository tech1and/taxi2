import { useState, useEffect, useRef } from 'react';
import { taxiparksAPI } from '../lib/api';
import TaxiParkCard from './TaxiParkCard';

const SORT_OPTIONS = [
  { key: 'rating', label: '⭐ Рейтинг', icon: 'bi-star-fill' },
  { key: 'likes_count', label: '❤️ Лайки', icon: 'bi-heart-fill' },
  { key: 'comments', label: '💬 Отзывы', icon: 'bi-chat-fill' },
  { key: 'views_count', label: '👁 Просмотры', icon: 'bi-eye-fill' },
];

export default function RatingList({ initialData, isSSR = false }) {
  const [taxiparks, setTaxiparks] = useState(initialData?.results || []);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState(isSSR ? (initialData?.sortBy || 'views_count') : 'views_count');
  const [currentPage, setCurrentPage] = useState(isSSR ? (initialData?.page || 1) : 1);
  const [totalPages, setTotalPages] = useState(isSSR ? (initialData?.totalPages || 1) : 1);
  const [totalCount, setTotalCount] = useState(isSSR ? (initialData?.totalCount || 0) : 0);
  const [transitioning, setTransitioning] = useState(false);

  // SSR-данные уже загружены, поэтому первый рендер не требует fetch
  const isFirstLoad = useRef(isSSR);

  const fetchTaxiparks = async (sort, page) => {
    setTransitioning(true);
    try {
      let params = { page_size: 20, page };

      if (sort === 'comments') {
        params.sort_by = 'comments';
      } else {
        params.ordering = `-${sort}`;
      }

      const res = await taxiparksAPI.getList(params);
      const results = res.data.results || res.data;
      const count = res.data.count || results.length;
      const total = Math.ceil(count / 20);

      setTimeout(() => {
        setTaxiparks(results);
        setTotalPages(total);
        setTotalCount(count);
        setCurrentPage(page);
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
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return; // Пропускаем первый рендер — SSR данные уже есть
    }
    fetchTaxiparks(sortBy, 1);
  }, [sortBy]);

  const handleSort = (sort) => {
    if (sort === sortBy) return;
    setLoading(true);
    setSortBy(sort);
  };

  const handlePage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    if (isSSR) {
      // SSR — переходим на URL
      window.location.href = `/rating?page=${page}&sort=${sortBy || 'views_count'}`;
    } else {
      setLoading(true);
      fetchTaxiparks(sortBy, page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Генерация номеров страниц
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const showPages = [];

    showPages.push(1);
    if (currentPage > 3) showPages.push('...');
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      showPages.push(i);
    }
    if (currentPage < totalPages - 2) showPages.push('...');
    if (totalPages > 1) showPages.push(totalPages);

    // Убираем дубликаты и "..." подряд
    const unique = [];
    let prevEllipsis = false;
    for (const p of showPages) {
      if (p === '...') {
        if (!prevEllipsis) unique.push(p);
        prevEllipsis = true;
      } else {
        if (!unique.includes(p)) unique.push(p);
        prevEllipsis = false;
      }
    }

    return (
      <nav className="d-flex justify-content-center align-items-center gap-1 mt-4 flex-wrap" aria-label="Пагинация">
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={currentPage === 1}
          onClick={() => handlePage(currentPage - 1)}
        >
          ← Назад
        </button>

        {unique.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-2 text-muted">…</span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm ${currentPage === p ? 'btn-warning fw-bold active' : 'btn-outline-secondary'}`}
              onClick={() => handlePage(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={currentPage === totalPages}
          onClick={() => handlePage(currentPage + 1)}
        >
          Вперёд →
        </button>
      </nav>
    );
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
              rank={(currentPage - 1) * 20 + i + 1}
            />
          ))
        ) : (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox fs-1 d-block mb-3"></i>
            <p>Нет данных для отображения</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && taxiparks.length > 0 && renderPagination()}

      {/* Count info */}
      {!loading && taxiparks.length > 0 && (
        <p className="text-muted text-center small mt-3">
          Страница {currentPage} из {totalPages} (всего {totalCount} таксопарков)
        </p>
      )}
    </div>
  );
}