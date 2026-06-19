# Make Celery import optional for development
try:
    from .celery import app as celery_app
    __all__ = ["celery_app"]
except ImportError:
    # Celery not installed - OK for development
    pass
