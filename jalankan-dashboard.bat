@echo off
REM ============================================================
REM  Dobel-klik file ini untuk membuka DASHBOARD di browser.
REM  (Windows) Pastikan Python & requirements sudah terpasang:
REM     pip install -r requirements.txt
REM ============================================================
cd /d "%~dp0"
echo Membuka dashboard... jangan tutup jendela ini selama dashboard dipakai.
python -m streamlit run scripts\dashboard.py
pause
