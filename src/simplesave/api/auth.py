"""Interim token auth.

SECURITY: clients can NEVER choose their own role. Everyone registers as ``client``;
elevation to ``advisor``/``manager`` happens only out-of-band (DB / a future admin tool),
never through this API. ``/login`` does not auto-create accounts.

This is a stop-gap. Per CLAUDE.md §2 the production target is Supabase Auth (GoTrue)
verified server-side; that integration is the next auth task (see PROGRESS.md).
"""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from simplesave.db.base import get_db
from simplesave.db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    # NOTE: no ``role`` field — role is server-controlled and always starts as "client".


class LoginRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str
    role: str


class UserProfile(BaseModel):
    id: str
    email: str
    phone: str | None
    role: str


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.removeprefix("Bearer ").strip()
    user = db.query(User).filter(User.token == token).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    token = secrets.token_urlsafe(32)
    # role is forced to "client"; never taken from the request body.
    user = User(email=body.email, phone=body.phone, role="client", token=token)
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=token, user_id=user.id, email=user.email, role=user.role)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == body.email).first()
    if user is None:
        # Do NOT auto-create — that previously let anyone mint an account/role.
        raise HTTPException(status_code=401, detail="Unknown account")
    user.token = secrets.token_urlsafe(32)
    db.commit()
    return AuthResponse(token=user.token or "", user_id=user.id, email=user.email, role=user.role)


@router.get("/me", response_model=UserProfile)
def me(user: User = Depends(get_current_user)) -> UserProfile:
    return UserProfile(id=user.id, email=user.email, phone=user.phone, role=user.role)
