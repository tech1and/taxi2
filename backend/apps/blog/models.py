from django.db import models
from django.utils.text import slugify
import uuid


class Category(models.Model):
    name = models.CharField('Название', max_length=100)
    slug = models.SlugField('URL', max_length=100, unique=True)
    description = models.TextField('Описание', blank=True)

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'

    def __str__(self):
        return self.name


class Post(models.Model):
    title = models.CharField('Заголовок', max_length=300)
    slug = models.SlugField('URL', max_length=300, unique=True, blank=True)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='posts',
        verbose_name='Категория'
    )
    excerpt = models.TextField('Краткое описание', max_length=500)
    content = models.TextField('Содержание')
    image = models.ImageField('Изображение', upload_to='blog/images/', blank=True, null=True)
    
    # SEO
    meta_title = models.CharField('Meta Title', max_length=200, blank=True)
    meta_description = models.CharField('Meta Description', max_length=500, blank=True)
    meta_keywords = models.CharField('Meta Keywords', max_length=300, blank=True)
    
    views_count = models.PositiveIntegerField('Просмотры', default=0)
    is_published = models.BooleanField('Опубликован', default=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлен', auto_now=True)

    class Meta:
        verbose_name = 'Статья'
        verbose_name_plural = 'Статьи'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title, allow_unicode=True)
            if not base_slug:
                base_slug = str(uuid.uuid4())[:8]
            self.slug = base_slug
        if not self.meta_title:
            self.meta_title = self.title
        if not self.meta_description:
            self.meta_description = self.excerpt[:500]
        super().save(*args, **kwargs)