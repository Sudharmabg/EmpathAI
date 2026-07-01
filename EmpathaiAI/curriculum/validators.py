"""
curriculum/validators.py
─────────────────────────
Pydantic output schemas for every AI task.
Used to validate OpenAI responses before returning them to Spring Boot.
"""

from typing import Optional
from pydantic import BaseModel, field_validator


# ── Flashcard ─────────────────────────────────────────────────────────────────

class Flashcard(BaseModel):
    front: str
    back: str
    hint: Optional[str] = None
    example: Optional[str] = None
    memoryTip: Optional[str] = None

class FlashcardsOutput(BaseModel):
    flashcards: list[Flashcard]

    @field_validator("flashcards")
    @classmethod
    def must_not_be_empty(cls, v):
        if not v:
            raise ValueError("flashcards list must not be empty")
        return v


# ── Summary ───────────────────────────────────────────────────────────────────

class SummaryOutput(BaseModel):
    shortSummary: str
    detailedSummary: str
    bulletPoints: list[str]

    @field_validator("bulletPoints")
    @classmethod
    def must_have_bullets(cls, v):
        if not v:
            raise ValueError("bulletPoints must not be empty")
        return v


# ── Mnemonic ──────────────────────────────────────────────────────────────────

class MnemonicItem(BaseModel):
    concept: str
    mnemonic: str
    expansion: Optional[str] = None
    explanation: str

class MnemonicOutput(BaseModel):
    mnemonics: list[MnemonicItem]

    @field_validator("mnemonics")
    @classmethod
    def must_not_be_empty(cls, v):
        if not v:
            raise ValueError("mnemonics list must not be empty")
        return v


# ── Mock Test ─────────────────────────────────────────────────────────────────

class MCQQuestion(BaseModel):
    question: str
    options: list[str]
    correctIndex: int
    explanation: str

    @field_validator("options")
    @classmethod
    def must_have_four_options(cls, v):
        if len(v) != 4:
            raise ValueError("MCQ must have exactly 4 options")
        return v

    @field_validator("correctIndex")
    @classmethod
    def valid_correct_index(cls, v):
        if v not in (0, 1, 2, 3):
            raise ValueError("correctIndex must be 0, 1, 2, or 3")
        return v

class HOTSQuestion(BaseModel):
    question: str
    expectedAnswer: str

class TestSection(BaseModel):
    mcqs: list[MCQQuestion]
    hots: list[HOTSQuestion]

class MockTestOutput(BaseModel):
    chapterLevel: TestSection
    topicLevel: TestSection


# ── Metadata ──────────────────────────────────────────────────────────────────

TASK_VALIDATORS = {
    "FLASHCARDS": FlashcardsOutput,
    "SUMMARY":    SummaryOutput,
    "MNEMONIC":   MnemonicOutput,
    "MOCK_TEST":  MockTestOutput,
}


def validate_output(task: str, raw_json: dict) -> dict:
    """
    Validate raw_json against the task's Pydantic schema.
    Returns the validated dict (Pydantic model .model_dump()).
    Raises ValueError if validation fails.
    """
    validator_class = TASK_VALIDATORS.get(task.upper())
    if not validator_class:
        raise ValueError(f"No validator for task: {task}")
    model = validator_class.model_validate(raw_json)
    return model.model_dump()
