from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.db.models import F, Count, Q
from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import TaxiPark, Like, Comment
from .serializers import (
    TaxiParkListSerializer,
    TaxiParkDetailSerializer,
    CommentSerializer,
)
import logging

logger = logging.getLogger(__name__)


class CommentThrottle(AnonRateThrottle):
    rate = '5/hour'
    scope = 'comment'


def get_client_ip(request):
    """Получение реального IP-адреса клиента"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class TaxiParkViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для таксопарков"""
    queryset = TaxiPark.objects.filter(is_active=True)
    lookup_field = 'slug'  # 🔥 Используем slug вместо pk в URL
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['district']
    ordering_fields = ['likes_count', 'views_count', 'rating', 'created_at']
    ordering = ['-rating', '-likes_count']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TaxiParkDetailSerializer
        return TaxiParkListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Аннотируем количество одобренных комментариев
        qs = qs.annotate(
            approved_comments_count=Count(
                'comments',
                filter=Q(comments__is_approved=True)
            )
        )
        sort_by = self.request.query_params.get('sort_by', '')
        if sort_by == 'comments':
            qs = qs.order_by('-approved_comments_count')
        return qs

    def retrieve(self, request, *args, **kwargs):
        """Переопределяем retrieve для подсчёта просмотров"""
        instance = self.get_object()
        ip = get_client_ip(request)
        cache_key = f'view_{instance.pk}_{ip}'
        
        if not cache.get(cache_key):
            TaxiPark.objects.filter(pk=instance.pk).update(
                views_count=F('views_count') + 1
            )
            cache.set(cache_key, True, 60 * 60)  # Кэш на 1 час
            instance.refresh_from_db()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='like', permission_classes=[])
    def like(self, request, slug=None):
        """Обработка лайка/дизлайка таксопарка"""
        taxipark = self.get_object()  # 🔥 Автоматически использует lookup_field='slug'
        ip = get_client_ip(request)

        like, created = Like.objects.get_or_create(
            taxipark=taxipark,
            ip_address=ip,
        )

        if not created:
            # Если лайк уже был — удаляем (дизлайк)
            like.delete()
            TaxiPark.objects.filter(pk=taxipark.pk).update(
                likes_count=F('likes_count') - 1
            )
            taxipark.refresh_from_db()
            return Response({
                'liked': False,
                'likes_count': taxipark.likes_count,
            })

        # Новый лайк — увеличиваем счётчик
        TaxiPark.objects.filter(pk=taxipark.pk).update(
            likes_count=F('likes_count') + 1
        )
        taxipark.refresh_from_db()
        return Response({
            'liked': True,
            'likes_count': taxipark.likes_count,
        })

    @action(
        detail=True,
        methods=['post'],
        url_path='comment',
        throttle_classes=[CommentThrottle],
        permission_classes=[]
    )
    def add_comment(self, request, slug=None):
        """Добавление комментария к таксопарку"""
        taxipark = self.get_object()
        serializer = CommentSerializer(data=request.data)
        
        if serializer.is_valid():
            # Анти-бот: проверка времени заполнения формы
            form_time = request.data.get('form_time', 0)
            try:
                if int(form_time) < 3:
                    return Response(
                        {'error': 'Заполнено слишком быстро. Пожалуйста, попробуйте снова.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except (ValueError, TypeError):
                pass

            serializer.save(
                taxipark=taxipark,
                ip_address=get_client_ip(request),
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)