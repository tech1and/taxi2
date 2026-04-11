from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.blog.sitemaps import PostSitemap, CategorySitemap, TaxiParkSitemap, StaticViewSitemap

sitemaps = {
    'posts': PostSitemap,
    'categories': CategorySitemap,
    'taxiparks': TaxiParkSitemap,
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('admin/', admin.site.urls),
    path('tinymce/', include('tinymce.urls')),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps},
         name='django.contrib.sitemaps.views.sitemap'),
    path('api/taxiparks/', include('apps.taxiparks.urls')),
    path('api/blog/', include('apps.blog.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)