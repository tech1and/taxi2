from rest_framework import serializers
from .models import TaxiPark, Like, Comment
import re


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'author_name', 'text', 'rating', 'created_at', 'honeypot']
        read_only_fields = ['id', 'created_at']

    def validate_honeypot(self, value):
        if value:
            raise serializers.ValidationError('Спам обнаружен.')
        return value

    def validate_text(self, value):
        # Проверка на URL-спам
        url_pattern = re.compile(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|'
            r'(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        )
        urls = url_pattern.findall(value)
        if len(urls) > 2:
            raise serializers.ValidationError('Слишком много ссылок в комментарии.')
        if len(value) < 10:
            raise serializers.ValidationError('Комментарий слишком короткий.')
        if len(value) > 2000:
            raise serializers.ValidationError('Комментарий слишком длинный.')
        return value

    def validate_author_name(self, value):
        if len(value) < 2:
            raise serializers.ValidationError('Имя слишком короткое.')
        return value


class TaxiParkListSerializer(serializers.ModelSerializer):
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = TaxiPark
        fields = [
            'id', 'name', 'slug', 'short_description',
            'logo', 'rating', 'likes_count', 'views_count',
            'comments_count', 'district', 'address',
            'price_per_km', 'min_price',
        ]

    def get_comments_count(self, obj):
        return obj.comments.filter(is_approved=True).count()


class TaxiParkDetailSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(many=True, source='approved_comments', read_only=True)
    comments_count = serializers.SerializerMethodField()
    schema_org = serializers.SerializerMethodField()
    user_liked = serializers.SerializerMethodField()

    class Meta:
        model = TaxiPark
        fields = [
            'id', 'name', 'slug', 'description', 'short_description',
            'logo', 'meta_title', 'meta_description', 'meta_keywords',
            'address', 'city', 'district', 'latitude', 'longitude',
            'phone', 'email', 'website', 'working_hours',
            'views_count', 'likes_count', 'comments_count',
            'rating', 'price_per_km', 'min_price',
            'has_children_seat', 'has_animal_transport',
            'has_cargo', 'has_minivan',
            'created_at', 'updated_at',
            'comments', 'schema_org', 'user_liked',
        ]

    def get_comments_count(self, obj):
        return obj.comments.filter(is_approved=True).count()

    def get_schema_org(self, obj):
        return obj.get_schema_org()

    def get_user_liked(self, obj):
        request = self.context.get('request')
        if request:
            ip = self._get_client_ip(request)
            return obj.likes.filter(ip_address=ip).exists()
        return False

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')