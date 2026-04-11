import Layout from '../components/Layout';
import RatingList from '../components/RatingList';
import { taxiparksAPI } from '../lib/api';
import Head from 'next/head';

export default function RatingPage({ ratingData }) {
  const { page, totalPages } = ratingData;

  return (
    <Layout
      title="Таксопарки Москвы Аренда Авто Для Такси"
      description="Официальные таксопарки Москвы: аренда авто для такси с лицензией от 1 дня. Низкий залог, моментальное подключение к Яндекс Go и Ситимобил. Автопарк от эконом до комфорт+."
    >
      <Head>
        <link rel="canonical" href="/rating" />
        {page > 1 && <link rel="prev" href={`/rating?page=${page - 1}`} />}
        {page < totalPages && <link rel="next" href={`/rating?page=${page + 1}`} />}
      </Head>
      <div className="hero-section py-5">
        <div className="container">
          <h1 className="fw-black text-white">
            <i className="bi bi-trophy-fill text-warning me-3"></i>
            Рейтинг таксопарков Москвы
          </h1>
          <p className="lead text-white-50">
            Все таксопарки Москвы — сортировка по рейтингу, лайкам и отзывам
          </p>
        </div>
      </div>

      <div className="container py-5">
        <RatingList initialData={ratingData} isSSR={true} />
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  try {
    const page = parseInt(context.query.page) || 1;
    const sort = context.query.sort || 'rating';
    const pageSize = 20;

    let params = { page_size: pageSize, page };

    if (sort === 'comments') {
      params.sort_by = 'comments';
    } else {
      params.ordering = `-${sort}`;
    }

    const res = await taxiparksAPI.getList(params);
    const results = res.data.results || res.data;
    const count = res.data.count || results.length;
    const totalPages = Math.ceil(count / pageSize);

    return {
      props: {
        ratingData: {
          results,
          page,
          totalPages,
          totalCount: count,
          sortBy: sort,
        },
      },
    };
  } catch (err) {
    console.error('SSR Error /rating:', err.message);
    return {
      props: {
        ratingData: {
          results: [],
          page: 1,
          totalPages: 1,
          totalCount: 0,
          sortBy: 'rating',
        },
      },
    };
  }
}