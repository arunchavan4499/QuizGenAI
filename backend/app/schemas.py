from enum import Enum
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class InputType(str, Enum):
    topic = "topic"
    document = "document"


class DifficultyLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class GenerateQuizRequest(BaseModel):
    quiz_id: str | None = Field(default=None, min_length=3)
    input_type: InputType
    difficulty: DifficultyLevel
    topic: str | None = Field(default=None, min_length=2, max_length=200)
    document_text: str | None = Field(default=None, min_length=20, max_length=20000)
    question_count: int = Field(default=5, ge=1, le=20)

    @model_validator(mode="after")
    def validate_input_payload(self) -> "GenerateQuizRequest":
        if self.input_type == InputType.topic and not self.topic:
            raise ValueError("topic is required when input_type is 'topic'")
        if self.input_type == InputType.document and not self.document_text:
            raise ValueError("document_text is required when input_type is 'document'")
        return self


class ExplainRequest(BaseModel):
    input_type: InputType
    topic: str | None = Field(default=None, min_length=2, max_length=200)
    document_text: str | None = Field(default=None, min_length=20, max_length=20000)
    question: str | None = Field(default=None, min_length=2, max_length=500)

    @model_validator(mode="after")
    def validate_input_payload(self) -> "ExplainRequest":
        if self.input_type == InputType.topic and not self.topic:
            raise ValueError("topic is required when input_type is 'topic'")
        if self.input_type == InputType.document and not self.document_text:
            raise ValueError("document_text is required when input_type is 'document'")
        return self


class ExplainResponse(BaseModel):
    explanation: str


class Question(BaseModel):
    question_id: str
    prompt: str
    options: list[str]


class GenerateQuizResponse(BaseModel):
    quiz_id: str
    difficulty: DifficultyLevel
    questions: list[Question]
    verification_token: str


class AnswerItem(BaseModel):
    question_id: str
    answer: str


class SubmitAnswersRequest(BaseModel):
    quiz_id: str
    difficulty: DifficultyLevel
    verification_token: str
    answers: list[AnswerItem]


class Insights(BaseModel):
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]


class ReviewAnswerItem(BaseModel):
    question_id: str
    prompt: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str | None = None


class SubmitAnswersResponse(BaseModel):
    score: float = Field(ge=0, le=100)
    correct_count: int = Field(ge=0)
    total_questions: int = Field(ge=1)
    marks_obtained: float = Field(ge=0)
    total_marks: float = Field(ge=1)
    review_items: list[ReviewAnswerItem] = Field(default_factory=list)
    insights: Insights


class LeaderboardEntry(BaseModel):
    user_id: int
    score: float = Field(ge=0, le=100)


class LeaderboardResponse(BaseModel):
    difficulty: str
    entries: list[LeaderboardEntry]
    top_percentages: list[float] = Field(default_factory=list)


class SubmissionMonthLabel(BaseModel):
    label: str
    col: int = Field(ge=1, le=52)


class SubmissionStreakResponse(BaseModel):
    dayLabels: list[str]
    months: list[SubmissionMonthLabel]
    levels: list[int]
    streakWeeks: int = Field(ge=0)
    currentStreakDays: int = Field(ge=0)
    recentActiveDays: list[int] = Field(default_factory=list)


class OverallInsightsRequest(BaseModel):
    quiz_id: str


class WrongAnswerDetail(BaseModel):
    difficulty: DifficultyLevel
    question_id: str
    prompt: str
    selected_answer: str
    correct_answer: str
    explanation: str | None = None


class OverallInsightsResponse(BaseModel):
    score: float = Field(ge=0, le=100)
    insights: Insights
    wrong_answers: list[WrongAnswerDetail]


class HealthResponse(BaseModel):
    status: str


class AuthRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthUserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime


class ProfileResponse(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    location: str = ""
    classYear: str = ""
    bio: str = ""
    photoUrl: str = ""


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default="", max_length=32)
    location: str | None = Field(default="", max_length=160)
    classYear: str | None = Field(default="", max_length=120)
    bio: str | None = Field(default="", max_length=1000)
    photoUrl: str | None = Field(default="", max_length=200000)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime
    user: AuthUserResponse
