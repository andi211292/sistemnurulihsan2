import os

filepath = 'd:/sistemnurulihsan/backend/app/schemas.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace for MedicalRecordUpdate
content = content.replace(
    "class MedicalRecordUpdate(BaseModel):\n    diagnosis: Optional[str] = None\n    medicine_given: Optional[str] = None\n",
    "class MedicalRecordUpdate(BaseModel):\n    diagnosis: Optional[str] = None\n    medicine_given: Optional[str] = None\n    is_recovered: Optional[bool] = None\n"
)

# Replace for MedicalRecordResponse
content = content.replace(
    "class MedicalRecordResponse(MedicalRecordBase):\n    medical_id: int\n    handled_by_user_id: int\n    timestamp: datetime\n    sync_status: bool\n",
    "class MedicalRecordResponse(MedicalRecordBase):\n    medical_id: int\n    handled_by_user_id: int\n    timestamp: datetime\n    is_recovered: bool\n    sync_status: bool\n"
)

# Replace with \r\n explicitly in case of Windows line endings
content = content.replace(
    "class MedicalRecordUpdate(BaseModel):\r\n    diagnosis: Optional[str] = None\r\n    medicine_given: Optional[str] = None\r\n",
    "class MedicalRecordUpdate(BaseModel):\r\n    diagnosis: Optional[str] = None\r\n    medicine_given: Optional[str] = None\r\n    is_recovered: Optional[bool] = None\r\n"
)

content = content.replace(
    "class MedicalRecordResponse(MedicalRecordBase):\r\n    medical_id: int\r\n    handled_by_user_id: int\r\n    timestamp: datetime\r\n    sync_status: bool\r\n",
    "class MedicalRecordResponse(MedicalRecordBase):\r\n    medical_id: int\r\n    handled_by_user_id: int\r\n    timestamp: datetime\r\n    is_recovered: bool\r\n    sync_status: bool\r\n"
)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Schemas patched successfully.")
