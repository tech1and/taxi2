from django.contrib import admin
from .models import TaxiPark, Like, Comment
from import_export.admin import ImportExportModelAdmin



@admin.register(TaxiPark)
class TaxiParkAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    list_display = ['name', 'district', 'rating', 'likes_count', 'views_count', 'is_active']
    list_filter = ['is_active', 'district', 'has_children_seat', 'has_cargo']
    search_fields = ['name', 'description', 'address']
    save_on_top = True
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['views_count', 'likes_count', 'created_at', 'updated_at']
    fieldsets = (
        ('Основное', {
            'fields': ('name', 'slug', 'short_description', 'description', 'logo', 'is_active')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description', 'meta_keywords'),
            'classes': ('collapse',),
        }),
        ('Геолокация', {
            'fields': ('address', 'city', 'district', 'latitude', 'longitude'),
        }),
        ('Контакты', {
            'fields': ('phone', 'email', 'website', 'working_hours'),
        }),
        ('Тарифы', {
            'fields': ('price_per_km', 'min_price'),
        }),
        ('Опции', {
            'fields': ('has_children_seat', 'has_animal_transport', 'has_cargo', 'has_minivan'),
        }),
        ('Статистика', {
            'fields': ('rating', 'views_count', 'likes_count', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),

    )
    def view_on_site(self, obj):
        return f'/taxiparks/{obj.slug}/'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['author_name', 'taxipark', 'rating', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'rating']
    search_fields = ['author_name', 'text']
    list_editable = ['is_approved']
    readonly_fields = ['ip_address', 'honeypot', 'created_at']


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['taxipark', 'ip_address', 'created_at']
    readonly_fields = ['taxipark', 'ip_address', 'created_at']