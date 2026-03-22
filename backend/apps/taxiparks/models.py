from django.db import models
from django.utils.text import slugify
import uuid
from tinymce.models import HTMLField


class TaxiPark(models.Model):
    name = models.CharField('Название', max_length=200)
    slug = models.SlugField('URL', max_length=200, unique=True, blank=True)
    description = HTMLField('Описание')
    short_description = models.CharField('Краткое описание', max_length=500)
    logo = models.ImageField('Логотип', upload_to='taxiparks/logos/', blank=True, null=True)
    
    # SEO поля
    meta_title = models.CharField('Meta Title', max_length=200, blank=True)
    meta_description = models.CharField('Meta Description', max_length=500, blank=True)
    meta_keywords = models.CharField('Meta Keywords', max_length=300, blank=True)
    
    # GEO поля
    address = models.CharField('Адрес', max_length=500, blank=True)
    city = models.CharField('Город', max_length=100, default='Москва')
    district = models.CharField('Район Москвы', max_length=100, blank=True)
    latitude = models.DecimalField('Широта', max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField('Долгота', max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Контакты
    phone = models.CharField('Телефон', max_length=50, blank=True)
    email = models.EmailField('Email', blank=True)
    website = models.URLField('Сайт', blank=True)
    
    # Рабочие часы
    working_hours = models.CharField('Часы работы', max_length=100, default='Круглосуточно')
    
    # Статистика
    views_count = models.PositiveIntegerField('Просмотры', default=0)
    likes_count = models.PositiveIntegerField('Лайки', default=0)
    
    # Рейтинг
    rating = models.FloatField('Рейтинг', default=0.0)
    
    # Тарифы
    price_per_km = models.DecimalField('Цена за км', max_digits=8, decimal_places=2, null=True, blank=True)
    min_price = models.DecimalField('Минимальная стоимость', max_digits=8, decimal_places=2, null=True, blank=True)
    
    # Особенности
    has_children_seat = models.BooleanField('Детское кресло', default=False)
    has_animal_transport = models.BooleanField('Перевозка животных', default=False)
    has_cargo = models.BooleanField('Грузовое такси', default=False)
    has_minivan = models.BooleanField('Минивэн', default=False)
    
    is_active = models.BooleanField('Активен', default=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлен', auto_now=True)

    class Meta:
        verbose_name = 'Таксопарк'
        verbose_name_plural = 'Таксопарки'
        ordering = ['-rating', '-likes_count']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=True)
            if not base_slug:
                base_slug = str(uuid.uuid4())[:8]
            self.slug = base_slug
        if not self.meta_title:
            self.meta_title = f'{self.name} — Таксопарк Москвы | Рейтинг и отзывы'
        if not self.meta_description:
            self.meta_description = (
                f'{self.name} — таксопарк в Москве. '
                f'{self.short_description[:200]}. '
                f'Читайте отзывы и смотрите рейтинг.'
            )
        super().save(*args, **kwargs)

    @property
    def comments_count(self):
        return self.comments.filter(is_approved=True).count()

    def get_schema_org(self):
        schema = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": self.name,
            "description": self.meta_description,
            "address": {
                "@type": "PostalAddress",
                "addressLocality": self.city,
                "streetAddress": self.address,
                "addressCountry": "RU",
            },
        }
        if self.latitude and self.longitude:
            schema["geo"] = {
                "@type": "GeoCoordinates",
                "latitude": str(self.latitude),
                "longitude": str(self.longitude),
            }
        if self.phone:
            schema["telephone"] = self.phone
        if self.website:
            schema["url"] = self.website
        return schema


class Like(models.Model):
    taxipark = models.ForeignKey(TaxiPark, on_delete=models.CASCADE, related_name='likes')
    ip_address = models.GenericIPAddressField('IP адрес')
    session_key = models.CharField('Ключ сессии', max_length=100, blank=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)

    class Meta:
        unique_together = ['taxipark', 'ip_address']
        verbose_name = 'Лайк'
        verbose_name_plural = 'Лайки'


class Comment(models.Model):
    taxipark = models.ForeignKey(TaxiPark, on_delete=models.CASCADE, related_name='comments')
    author_name = models.CharField('Имя', max_length=100)
    author_email = models.EmailField('Email')
    text = models.TextField('Текст комментария')
    rating = models.PositiveSmallIntegerField('Оценка', choices=[(i, i) for i in range(1, 6)], default=5)
    
    # Антиспам
    honeypot = models.CharField('Honeypot', max_length=100, blank=True)
    ip_address = models.GenericIPAddressField('IP адрес', null=True, blank=True)
    
    is_approved = models.BooleanField('Одобрен', default=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)

    class Meta:
        verbose_name = 'Комментарий'
        verbose_name_plural = 'Комментарии'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.author_name} → {self.taxipark.name}'