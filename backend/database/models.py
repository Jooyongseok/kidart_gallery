import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="artist")  # artist | viewer | admin
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    artworks: Mapped[list["Artwork"]] = relationship("Artwork", back_populates="owner")


class Artwork(Base):
    __tablename__ = "artworks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)  # 로컬 파일 경로 or URL
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="artworks")
    stories: Mapped[list["Story"]] = relationship("Story", back_populates="artwork")


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    artwork_id: Mapped[int] = mapped_column(Integer, ForeignKey("artworks.id"), nullable=False)
    template: Mapped[str] = mapped_column(String(50), default="default")  # default|fantasy|adventure|nature|custom
    vlm_model: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    pages_json: Mapped[str] = mapped_column(Text, nullable=False)   # JSON array of page texts
    scenes_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array of scene prompts
    page_images_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of image paths
    layout_suggestion: Mapped[str | None] = mapped_column(Text, nullable=True)  # Design agent output
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    artwork: Mapped["Artwork"] = relationship("Artwork", back_populates="stories")
