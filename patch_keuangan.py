with open('backend/app/routers/keuangan.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace get_expenses
search_get = """@router.get("/pengeluaran/", response_model=List[schemas.ExpenseResponse])
def get_expenses(
    month: Optional[int] = None, 
    year: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    return crud.get_expenses(db, month=month, year=year)"""

replacement_get = """@router.get("/pengeluaran/", response_model=List[schemas.ExpenseResponse])
def get_expenses(
    month: Optional[int] = None, 
    year: Optional[int] = None,
    gender_scope: Optional[str] = None,
    db: Session = Depends(get_db),
    user_role: models.RoleEnum = Depends(require_role([models.RoleEnum.KASIR_KOP_PUSAT, models.RoleEnum.KASIR_KOP_LUAR, models.RoleEnum.KASIR_SYAHRIYAH_PUTRA, models.RoleEnum.KASIR_SYAHRIYAH_PUTRI, models.RoleEnum.SUPER_ADMIN]))
):
    if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRA:
        gender_scope = "PUTRA"
    elif user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRI:
        gender_scope = "PUTRI"
    return crud.get_expenses(db, month=month, year=year, gender_scope=gender_scope)"""

# Replace create_expense
search_create = """@router.post("/pengeluaran/", response_model=schemas.ExpenseResponse)
def create_expense(
    expense: schemas.ExpenseCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    return crud.create_expense(db, expense=expense, recorded_by_user_id=user_id)"""

replacement_create = """@router.post("/pengeluaran/", response_model=schemas.ExpenseResponse)
def create_expense(
    expense: schemas.ExpenseCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
    user_role: models.RoleEnum = Depends(require_role([models.RoleEnum.KASIR_KOP_PUSAT, models.RoleEnum.KASIR_KOP_LUAR, models.RoleEnum.KASIR_SYAHRIYAH_PUTRA, models.RoleEnum.KASIR_SYAHRIYAH_PUTRI, models.RoleEnum.SUPER_ADMIN]))
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRA:
        if expense.gender_scope != "PUTRA":
            raise HTTPException(status_code=403, detail="Akses Ditolak: Kasir Putra hanya mencatat PUTRA")
            
    if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRI:
        if expense.gender_scope != "PUTRI":
            raise HTTPException(status_code=403, detail="Akses Ditolak: Kasir Putri hanya mencatat PUTRI")
        
    return crud.create_expense(db, expense=expense, recorded_by_user_id=user_id)"""

# Normalisasi Line endings
search_get = search_get.replace("\r", "")
search_create = search_create.replace("\r", "")
text = text.replace("\r", "")

text = text.replace(search_get, replacement_get)
text = text.replace(search_create, replacement_create)

with open('backend/app/routers/keuangan.py', 'w', encoding='utf-8') as f:
    f.write(text)
    
print("Success rewriting.")
