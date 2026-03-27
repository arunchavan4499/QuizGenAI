from pwdlib import PasswordHash


# Password Hashing
password_hash = PasswordHash.recommended()

def get_password_hash(password: str):
    return password_hash.hash(password=password)

def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)