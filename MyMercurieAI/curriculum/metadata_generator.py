"""
curriculum/metadata_generator.py
─────────────────────────────────
Calls GPT-4o-mini once per chapter to extract structured educational metadata.
Returns a validated dict conforming to the ChapterMetadata schema.
"""

import json
import logging
import os
from openai import OpenAI
from dotenv import load_dotenv
from curriculum.prompt_engine import load_prompt

load_dotenv()
logger = logging.getLogger("metadata_generator")

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MAX_RETRIES = 3


def generate_metadata(
    raw_text: str,
    grade: str,
    subject: str,
    chapter_title: str,
    board: str = "CBSE"
) -> dict:
    """
    Extract structured metadata from raw chapter text using GPT-4o-mini.

    Returns dict with keys:
        topics, subtopics, concepts, learning_objectives, blooms_levels,
        difficulty_level, keywords, definitions, formulae,
        common_misconceptions, prerequisites, next_concepts,
        estimated_reading_time
    """
    system_prompt, user_prompt_template = load_prompt("metadata")
    user_prompt = user_prompt_template.format(
        board=board,
        grade=grade,
        subject=subject,
        chapter_title=chapter_title,
        raw_text=raw_text[:8000]   # truncate to ~2000 words to stay within context
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = _client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
            metadata = json.loads(raw)
            _validate_metadata(metadata)
            logger.info(
                "Metadata generated for '%s' | topics=%d | keywords=%d",
                chapter_title,
                len(metadata.get("topics", [])),
                len(metadata.get("keywords", []))
            )
            return metadata
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning("Metadata attempt %d failed: %s", attempt, e)
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"Metadata generation failed after {MAX_RETRIES} attempts: {e}")

    return {}


def _validate_metadata(metadata: dict):
    """Raise ValueError if required fields are missing or wrong type."""
    required_lists = ["topics", "learning_objectives", "keywords"]
    for field in required_lists:
        if field not in metadata:
            raise ValueError(f"Missing required field: {field}")
        if not isinstance(metadata[field], list):
            raise ValueError(f"Field '{field}' must be a list")
    if "difficulty_level" not in metadata:
        metadata["difficulty_level"] = "Medium"
    if "estimated_reading_time" not in metadata:
        metadata["estimated_reading_time"] = 15
