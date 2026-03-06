import Layout from '../../components/Layout';
import Link from 'next/link';
import { blogAPI } from '../../lib/api';

export default function BlogPostPage({ post, error }) {
  if (error || !post) {
    return (
      <Layout title="Статья не найдена">
        <div className="container py-5 text-center">
          <h1>Статья не найдена</h1>
          <Link href="/blog" className="btn btn-warning mt-3">В блог</Link>
        </div>
      </Layout>
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.meta_title || post.title,
    "description": post.meta_description || post.excerpt,
    "datePublished": post.created_at,
    "dateModified": post.updated_at,
    "publisher": {
      "@type": "Organization",
      "name": "ТаксоРейтинг Москвы",
      "url": siteUrl,
    },
  };

  return (
    <Layout
      title={post.meta_title || post.title}
      description={post.meta_description || post.excerpt}
      canonical={`${siteUrl}/blog/${post.slug}`}
      schema={articleSchema}
    >
      {/* Breadcrumb */}
      <div className="breadcrumb-section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item"><Link href="/">Главная</Link></li>
              <li className="breadcrumb-item"><Link href="/blog">Блог</Link></li>
              <li className="breadcrumb-item active">{post.title.slice(0, 40)}...</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="container py-5">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            {post.category && (
              <span className="badge bg-warning text-dark mb-3 px-3 py-2">
                {post.category.name}
              </span>
            )}

            <h1 className="fw-black mb-3">{post.title}</h1>

            <div className="d-flex align-items-center gap-3 text-muted small mb-4">
              <span>
                <i className="bi bi-calendar3 me-1"></i>
                {new Date(post.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </span>
              <span>
                <i className="bi bi-eye me-1"></i>
                {post.views_count?.toLocaleString('ru')} просмотров
              </span>
            </div>

            {post.image && (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${post.image}`}
                alt={post.title}
                className="img-fluid rounded-3 mb-4 w-100"
                style={{ maxHeight: 400, objectFit: 'cover' }}
              />
            )}

            <div
              className="blog-content"
              style={{ lineHeight: 1.9, fontSize: '1.05rem' }}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <hr className="my-5" />

            <div className="d-flex justify-content-between align-items-center">
              <Link href="/blog" className="btn btn-outline-secondary">
                <i className="bi bi-arrow-left me-2"></i>К списку статей
              </Link>
              <Link href="/" className="btn btn-warning">
                Смотреть рейтинг 🏆
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const res = await blogAPI.getPost(params.slug);
    return { props: { post: res.data } };
  } catch (err) {
    if (err.response?.status === 404) {
      return { notFound: true };
    }
    return { props: { post: null, error: true } };
  }
}