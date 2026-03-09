import { useState, useEffect, useRef } from 'react';
import { taxiparksAPI } from '../lib/api';

export default function CommentForm({ slug, onCommentAdded }) {
  const [formData, setFormData] = useState({
    author_name: '',
    author_email: '',
    text: '',
    rating: 5,
    honeypot: '', // скрытое поле-ловушка
  });
  const [formStartTime, setFormStartTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [charCount, setCharCount] = useState(0);
  const formRef = useRef(null);

  useEffect(() => {
    setFormStartTime(Date.now());
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'text') setCharCount(value.length);
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.author_name.trim() || formData.author_name.length < 2) {
      newErrors.author_name = 'Введите ваше имя (минимум 2 символа)';
    }
    if (!formData.author_email.includes('@')) {
      newErrors.author_email = 'Введите корректный email';
    }
    if (!formData.text.trim() || formData.text.length < 10) {
      newErrors.text = 'Комментарий должен содержать минимум 10 символов';
    }
    if (formData.text.length > 2000) {
      newErrors.text = 'Комментарий слишком длинный (максимум 2000 символов)';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const timeSpent = Math.floor((Date.now() - formStartTime) / 1000);

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        form_time: timeSpent,
      };
      const res = await taxiparksAPI.addComment(slug, payload);
      setSuccess(true);
      setFormData({
        author_name: '',
        author_email: '',
        text: '',
        rating: 5,
        honeypot: '',
      });
      setCharCount(0);
      setFormStartTime(Date.now());

      if (onCommentAdded) {
        onCommentAdded(res.data);
      }
    } catch (err) {
      if (err.response?.data) {
        const apiErrors = {};
        Object.entries(err.response.data).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? val[0] : val;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ general: 'Ошибка отправки. Пожалуйста, попробуйте позже.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="alert alert-success d-flex align-items-center gap-2 fade-in-up">
        <i className="bi bi-check-circle-fill fs-4"></i>
        <div>
          <strong>Спасибо за ваш отзыв!</strong>
          <p className="mb-0 small">Комментарий успешно добавлен.</p>
        </div>
        <button
          className="btn btn-sm btn-outline-success ms-auto"
          onClick={() => setSuccess(false)}
        >
          Написать ещё
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="comment-form"
      noValidate
    >
      <h5 className="fw-bold mb-4">
        <i className="bi bi-pencil-square me-2 text-primary"></i>
        Оставить отзыв
      </h5>

      {errors.general && (
        <div className="alert alert-danger">{errors.general}</div>
      )}

      {/* Honeypot поле — скрыто от пользователей, видно только ботам */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
        <input
          type="text"
          name="honeypot"
          value={formData.honeypot}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Рейтинг */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Оценка</label>
        <div className="star-rating">
          {[5, 4, 3, 2, 1].map(star => (
            <label key={star} htmlFor={`star-${star}`} title={`${star} звёзд`}>
              <input
                type="radio"
                id={`star-${star}`}
                name="rating"
                value={star}
                checked={parseInt(formData.rating) === star}
                onChange={handleChange}
              />
              <i className="bi bi-star-fill"></i>
            </label>
          ))}
        </div>
      </div>

      <div className="row g-3">
        {/* Имя */}
        <div className="col-md-6">
          <label className="form-label fw-semibold" htmlFor="author_name">
            Ваше имя <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="author_name"
            name="author_name"
            className={`form-control ${errors.author_name ? 'is-invalid' : ''}`}
            value={formData.author_name}
            onChange={handleChange}
            placeholder="Иван Иванов"
            maxLength={100}
          />
          {errors.author_name && (
            <div className="invalid-feedback">{errors.author_name}</div>
          )}
        </div>

        {/* Email */}
        <div className="col-md-6">
          <label className="form-label fw-semibold" htmlFor="author_email">
            Email <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            id="author_email"
            name="author_email"
            className={`form-control ${errors.author_email ? 'is-invalid' : ''}`}
            value={formData.author_email}
            onChange={handleChange}
            placeholder="ivan@example.com"
          />
          {errors.author_email && (
            <div className="invalid-feedback">{errors.author_email}</div>
          )}
          <div className="form-text">Email не публикуется</div>
        </div>
      </div>

      {/* Текст */}
      <div className="mt-3">
        <label className="form-label fw-semibold" htmlFor="text">
          Ваш отзыв <span className="text-danger">*</span>
        </label>
        <textarea
          id="text"
          name="text"
          className={`form-control ${errors.text ? 'is-invalid' : ''}`}
          value={formData.text}
          onChange={handleChange}
          rows={4}
          placeholder="Поделитесь своим опытом пользования данным таксопарком..."
          maxLength={2000}
        />
        <div className="d-flex justify-content-between">
          {errors.text ? (
            <div className="invalid-feedback d-block">{errors.text}</div>
          ) : (
            <div className="form-text">Минимум 10 символов</div>
          )}
          <div className="form-text">
            {charCount}/2000
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="submit"
          className="btn btn-warning fw-bold px-4"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Отправка...
            </>
          ) : (
            <>
              <i className="bi bi-send me-2"></i>
              Отправить отзыв
            </>
          )}
        </button>
        <span className="small text-muted ms-3">
          <i className="bi bi-shield-check me-1"></i>
          Защита от спама
        </span>
      </div>
    </form>
  );
}