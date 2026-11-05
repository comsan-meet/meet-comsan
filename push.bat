@echo off
chcp 65001 >nul
echo ======================================================
echo   COMSAN Meeting System - Auto Push to GitHub
echo ======================================================
git status
echo.
set /p commit_msg="ระบุข้อความ Commit (กด Enter เพื่อใช้ค่าเริ่มต้น 'Update files'): "
if "%commit_msg%"=="" set commit_msg=Update files
git add -A
git commit -m "%commit_msg%"
git push origin main
echo.
echo ======================================================
echo   พุชข้อมูลขึ้น GitHub เรียบร้อยแล้ว!
echo ======================================================
pause
