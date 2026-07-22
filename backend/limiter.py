from slowapi import Limiter
from slowapi.util import get_remote_address

# Global Rate Limiter instance using client IP
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
