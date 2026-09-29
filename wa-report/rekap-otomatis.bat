@echo off
REM Dijalankan otomatis oleh Windows Task Scheduler.
REM Ubah dua jalur di bawah sesuai laptop Anda.
set FOLDER_CHAT=D:\wilayah\chat-masuk
set REPO=C:\Users\ASUS\CLAUDE-JOSH
node "%REPO%\wa-report\rekap-checkin.mjs" "%FOLDER_CHAT%" >> "%FOLDER_CHAT%\..\rekap\log.txt" 2>&1
