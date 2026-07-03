"""
curriculum/educational_chunker.py
───────────────────────────────────
Splits raw chapter text into educational chunks following the PRD hierarchy:
  Chapter → Topic → Subtopic → Explanation → Worked Example → Exercise → Summary

Strategy:
  1. Use heading detection (regex on ## / bold lines) to identify Topics.
  2. Within each topic, split further into Explanation / Example / Exercise / Summary
     using keyword pattern matching.
  3. Each chunk inherits grade, subject, chapter, topic context.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("educational_chunker")

CHUNK_TYPES = {
    "TOPIC": "TOPIC",
    "SUBTOPIC": "SUBTOPIC",
    "EXPLANATION": "EXPLANATION",
    "EXAMPLE": "EXAMPLE",
    "EXERCISE": "EXERCISE",
    "SUMMARY": "SUMMARY",
}

# Keywords that signal chunk type transitions
EXAMPLE_KEYWORDS = [
    r"\bexample\b", r"\billustration\b", r"\bsolved\s+problem\b",
    r"\bworked\s+example\b", r"\bsample\b"
]
EXERCISE_KEYWORDS = [
    r"\bexercise\b", r"\bpractice\b", r"\btry\s+yourself\b",
    r"\bproblem\s+set\b", r"\bquestions?\b", r"\bactivit"
]
SUMMARY_KEYWORDS = [
    r"\bsummary\b", r"\brecap\b", r"\bkey\s+points?\b",
    r"\bwhat\s+we\s+learned\b", r"\bin\s+brief\b"
]

@dataclass
class EducationalChunk:
    chunk_type: str
    text: str
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    metadata: dict = field(default_factory=dict)


def _detect_chunk_type(heading: str, text: str) -> str:
    """Determine chunk type from heading/content keywords."""
    combined = (heading + " " + text[:200]).lower()
    for pat in SUMMARY_KEYWORDS:
        if re.search(pat, combined):
            return CHUNK_TYPES["SUMMARY"]
    for pat in EXERCISE_KEYWORDS:
        if re.search(pat, combined):
            return CHUNK_TYPES["EXERCISE"]
    for pat in EXAMPLE_KEYWORDS:
        if re.search(pat, combined):
            return CHUNK_TYPES["EXAMPLE"]
    return CHUNK_TYPES["EXPLANATION"]


def _is_heading(line: str) -> bool:
    """Detect Markdown headings or bold lines as section markers."""
    stripped = line.strip()
    return (
        stripped.startswith("#")
        or (stripped.startswith("**") and stripped.endswith("**") and len(stripped) > 6)
        or re.match(r"^\d+\.\d*\s+[A-Z]", stripped) is not None
    )


def _extract_heading_text(line: str) -> str:
    """Clean heading markers to get the plain heading text."""
    line = re.sub(r"^#+\s*", "", line.strip())
    line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
    return line.strip()


def chunk_chapter(
    raw_text: str,
    grade: str,
    subject: str,
    chapter_title: str,
    ai_topics: list[str]
) -> list[EducationalChunk]:
    """
    Split a raw chapter into EducationalChunks.

    Args:
        raw_text:     The pasted chapter content.
        grade:        e.g. "Class 8"
        subject:      e.g. "Mathematics"
        chapter_title: e.g. "Fractions"
        ai_topics:    Topics extracted by metadata_generator (used to tag chunks).

    Returns:
        List of EducationalChunk objects.
    """
    lines = raw_text.splitlines()
    chunks: list[EducationalChunk] = []
    current_topic = None
    current_heading = ""
    buffer_lines: list[str] = []

    def flush_buffer():
        nonlocal buffer_lines, current_heading
        text = "\n".join(buffer_lines).strip()
        if len(text) < 50:   # skip trivially short chunks
            buffer_lines = []
            return

        chunk_type = _detect_chunk_type(current_heading, text)
        chunk = EducationalChunk(
            chunk_type=chunk_type,
            text=text,
            topic=current_topic,
            metadata={
                "grade": grade,
                "subject": subject,
                "chapter": chapter_title,
                "heading": current_heading,
            }
        )
        chunks.append(chunk)
        buffer_lines = []

    for line in lines:
        if _is_heading(line):
            flush_buffer()
            current_heading = _extract_heading_text(line)
            # Match heading to known topics
            for topic in ai_topics:
                if topic.lower() in current_heading.lower() or current_heading.lower() in topic.lower():
                    current_topic = topic
                    break
        else:
            buffer_lines.append(line)

    flush_buffer()

    # If no structure was detected, treat entire text as one EXPLANATION chunk
    if not chunks:
        chunks.append(EducationalChunk(
            chunk_type=CHUNK_TYPES["EXPLANATION"],
            text=raw_text.strip(),
            topic=chapter_title,
            metadata={"grade": grade, "subject": subject, "chapter": chapter_title}
        ))

    logger.info(
        "Chunked chapter '%s' → %d chunks | types: %s",
        chapter_title,
        len(chunks),
        {c.chunk_type for c in chunks}
    )
    return chunks
