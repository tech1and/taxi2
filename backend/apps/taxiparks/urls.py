from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaxiParkViewSet

router = DefaultRouter()
router.register(r'', TaxiParkViewSet, basename='taxipark')

urlpatterns = [
    path('', include(router.urls)),
]