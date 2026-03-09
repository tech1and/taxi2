import { useState } from 'react';
import { taxiparksAPI } from '../lib/api';

export default function LikeButton({ slug, initialLikes, initialLiked }) {
  const [likesCount, setLikesCount] = useState(initialLikes || 0);
  const [liked, setLiked] = useState(initialLiked || false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    setAnimating(true);

    try {
      const res = await taxiparksAPI.like(slug);
      setLikesCount(res.data.likes_count);
      setLiked(res.data.liked);
    } catch (err) {
      console.error('Ошибка лайка:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 300);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`like-btn ${liked ? 'liked' : ''}`}
      aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      <span className={`like-icon ${animating ? 'liked' : ''}`}>
        {liked ? '❤️' : '🤍'}
      </span>
      <span className="fw-bold">
        {loading ? (
          <span className="spinner-border spinner-border-sm" role="status" />
        ) : (
          likesCount.toLocaleString('ru')
        )}
      </span>
      <span className="d-none d-sm-inline">
        {liked ? 'Нравится' : 'Нравится?'}
      </span>
    </button>
  );
}