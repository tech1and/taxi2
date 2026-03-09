import Layout from '../../components/Layout';
import Link from 'next/link';
import { blogAPI } from '../../lib/api';

export default function BlogPage({ posts, categories }) {
  return (
    <Layout
      title="Блог о такси в Москве — советы и рейтинги"
      description="Полезные статьи о такси в Москве: советы, рейтинги, лайфхаки и актуальные новости."
    >
      <div className="hero-section py-5">
        <div className="container">
          <h1 className="fw-black text-white">
            <i className="bi bi-journal-text text-warning me-3"></i>
            Блог о такси в Москве
          </h1>
          <p className="lead text-white-50">
            Полезные статьи, советы и актуальные рейтинги
          </p>
        </div>
      </div>

      <div className="container py-5">
        {/* Categories */}
        {categories && categories.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-4">
            <span className="fw-semibold text-muted me-2">Категории:</span>
            {categories.map(cat => (
              <span key={cat.id} className="badge bg-warning text-dark px-3 py-2">
                {cat.name}
              </span>
            ))}
          </div>
        )}

        <div className="row g-4">
          {posts.map(post => (
            <div key={post.id} className="col-md-6 col-lg-4">
              <div className="taxi-card blog-card h-100">
                {post.image ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${post.image}`}
                    alt={post.title}
                    className="card-img-top"
                    style={{ height: 200, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center bg-light"
                    style={{ height: 200, fontSize: '4rem' }}
                  >
                    🚗
                  </div>
                )}
                <div className="card-body p-4">
                  {post.category && (
                    <span className="badge bg-warning text-dark mb-2">
                      {post.category.name}
                    </span>
                  )}
                  <h2 className="h6 card-title fw-bold">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-dark text-decoration-none"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="card-text text-muted small">
                    {post.excerpt?.slice(0, 120)}...
                  </p>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <small className="text-muted">
                      <i className="bi bi-calendar3 me-1"></i>
                      {new Date(post.created_at).toLocaleDateString('ru-RU')}
                    </small>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="btn btn-sm btn-outline-warning"
                    >
                      Читать →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-journal-x fs-1 d-block mb-3"></i>
            <p>Статей пока нет</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  try {
    const [postsRes, categoriesRes] = await Promise.all([
      blogAPI.getPosts(),
      blogAPI.getCategories(),
    ]);

    return {
      props: {
        posts: postsRes.data.results || postsRes.data,
        categories: categoriesRes.data.results || categoriesRes.data,
      },
    };
  } catch (err) {
    return {
      props: { posts: [], categories: [] },
    };
  }
}