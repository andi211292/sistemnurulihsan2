from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import List

from .models import RoleEnum
from .security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user_payload(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid, silakan login kembali",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("user_id")
        
        if username is None or role is None:
            raise credentials_exception
            
        return payload
    except JWTError:
        raise credentials_exception

def require_role(allowed_roles: List[RoleEnum]):
    def role_checker(payload: dict = Depends(get_current_user_payload)):
        user_role_str = payload.get("role")
        try:
            user_role = RoleEnum(user_role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role in token"
            )
            
        if user_role not in allowed_roles and user_role != RoleEnum.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Hak akses ditolak. Anda login sebagai {user_role.value}, fitur ini butuh wewenang lain."
            )
        return user_role
        
    return role_checker
