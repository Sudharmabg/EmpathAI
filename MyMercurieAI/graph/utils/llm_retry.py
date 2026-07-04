import time
import logging
from typing import Callable, Any

logger = logging.getLogger("llm_retry")

def with_retry(func: Callable[[], Any], max_attempts: int = 3, base_delay: float = 0.5) -> Any:
    """Execute *func* with exponential backoff.

    Parameters
    ----------
    func: Callable returning the LLM result.
    max_attempts: Number of attempts before raising the last exception.
    base_delay: Initial delay in seconds; doubled each retry.
    """
    attempt = 0
    delay = base_delay
    while True:
        try:
            return func()
        except Exception as exc:
            attempt += 1
            if attempt >= max_attempts:
                logger.error("LLM call failed after %d attempts", attempt)
                raise
            logger.warning("LLM call failed (attempt %d): %s – retrying in %.2fs", attempt, exc, delay)
            time.sleep(delay)
            delay *= 2
