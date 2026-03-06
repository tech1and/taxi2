from rest_framework import viewsets
from django.db.models import F
from django.core.cache import cache
from .models import Post, Category
from .serializers import PostListSerializer, PostDetailSerializer, CategorySerializer


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class PostViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Post.objects.filter(is_published=True).select_related('category')
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PostDetailSerializer
        return PostListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ip = get_client_ip(request)
        cache_key = f'blog_view_{instance.pk}_{ip}'
        
        if not cache.get(cache_key):
            Post.objects.filter(pk=instance.pk).update(
                views_count=F('views_count') + 1
            )
            cache.set(cache_key, True, 60 * 60)
            instance.refresh_from_db()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        from rest_framework.response import Response
        instance = self.get_object()
        ip = get_client_ip(request)
        cache_key = f'blog_view_{instance.pk}_{ip}'
        
        if not cache.get(cache_key):
            Post.objects.filter(pk=instance.pk).update(
                views_count=F('views_count') + 1
            )
            cache.set(cache_key, True, 3600)
            instance.refresh_from_db()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)