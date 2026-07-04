"""
curriculum/prompt_engine.py
────────────────────────────
Loads and caches prompt templates from the prompts/ directory.
Each prompt file has two sections separated by ---USER---:
  - Above the separator: system prompt
  - Below the separator: user prompt template (with {placeholders})
"""

import logging
import os
from pathlib import Path
from functools import lru_cache

logger = logging.getLogger("prompt_engine")

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
SEPARATOR = "---USER---"


@lru_cache(maxsize=None)
def load_prompt(name: str) -> tuple[str, str]:
    """
    Load prompt file by name (without .txt extension).
    Returns (system_prompt, user_prompt_template).
    Cached after first load.
    """
    path = PROMPTS_DIR / f"{name}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")

    content = path.read_text(encoding="utf-8")

    if SEPARATOR in content:
        parts = content.split(SEPARATOR, 1)
        system_prompt = parts[0].strip()
        user_template = parts[1].strip()
    else:
        system_prompt = content.strip()
        user_template = "{raw_text}"

    logger.debug("Loaded prompt: %s (%d chars system, %d chars user)",
                 name, len(system_prompt), len(user_template))
    return system_prompt, user_template
