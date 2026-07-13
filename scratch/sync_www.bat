@echo off
setlocal

set "SRC=E:\Owais\School Idea\SchoolIn"
set "DST=E:\Owais\School Idea\SchoolIn\www"

echo === CampusLink WWW Sync ===
echo Source: %SRC%
echo Dest:   %DST%
echo.

REM === Copy root-level frontend files ===
echo --- Copying root-level files ---
set COUNT=0

for %%F in (
    "about.html"
    "admin.css"
    "admissions.css"
    "admissions.html"
    "admissions.js"
    "app.js"
    "apply-admission.html"
    "apply-admission.js"
    "attendance.js"
    "auth.js"
    "child-safety.html"
    "classroom.html"
    "classroom.js"
    "classrooms.js"
    "college-dashboard.html"
    "college-dashboard.js"
    "college-profile.html"
    "complete-profile.html"
    "complete-profile.js"
    "create-classroom.html"
    "create-classroom.js"
    "dashboard.html"
    "dashboard.js"
    "delete-account.html"
    "event-detail.html"
    "event-detail.js"
    "events.css"
    "events.html"
    "events.js"
    "index.html"
    "join-alumni.html"
    "join-school.html"
    "login.html"
    "login.js"
    "logo.png"
    "messaging.css"
    "messaging.html"
    "messaging.js"
    "mobile-nav.js"
    "networking.html"
    "networking.js"
    "notifications.js"
    "privacy-policy.html"
    "profile.html"
    "profile.js"
    "school-profile.html"
    "school-profile.js"
    "schools.css"
    "schools.html"
    "schools.js"
    "students.js"
    "style.css"
    "supabase.js"
    "teacher_classroom_hub.js"
    "terms-and-conditions.html"
) do (
    if exist "%SRC%\%%~F" (
        copy /Y "%SRC%\%%~F" "%DST%\%%~F" >nul
        echo COPIED: %%~F
        set /a COUNT+=1
    ) else (
        echo MISSING: %%~F
    )
)

REM === Copy admin folder ===
echo.
echo --- Copying admin folder ---
if not exist "%DST%\admin" mkdir "%DST%\admin"
for %%F in ("%SRC%\admin\*.*") do (
    copy /Y "%%F" "%DST%\admin\%%~nxF" >nul
    echo COPIED: admin\%%~nxF
)

REM === Copy css folder ===
echo.
echo --- Copying css folder ---
if not exist "%DST%\css" mkdir "%DST%\css"
if not exist "%DST%\css\core" mkdir "%DST%\css\core"
for %%F in ("%SRC%\css\*.*") do (
    copy /Y "%%F" "%DST%\css\%%~nxF" >nul
    echo COPIED: css\%%~nxF
)
for %%F in ("%SRC%\css\core\*.*") do (
    copy /Y "%%F" "%DST%\css\core\%%~nxF" >nul
    echo COPIED: css\core\%%~nxF
)

REM === Remove stale files from www root ===
echo.
echo --- Removing stale www root files ---
REM Remove files in www root that are not in the expected frontend list
for %%F in ("%DST%\*.html" "%DST%\*.js" "%DST%\*.css") do (
    set "KEEP=NO"
    for %%E in (
        "about.html" "admin.css" "admissions.css" "admissions.html" "admissions.js"
        "app.js" "apply-admission.html" "apply-admission.js" "attendance.js"
        "auth.js" "child-safety.html" "classroom.html" "classroom.js" "classrooms.js"
        "college-dashboard.html" "college-dashboard.js" "college-profile.html"
        "complete-profile.html" "complete-profile.js" "create-classroom.html"
        "create-classroom.js" "dashboard.html" "dashboard.js" "delete-account.html"
        "event-detail.html" "event-detail.js" "events.css" "events.html" "events.js"
        "index.html" "join-alumni.html" "join-school.html" "login.html" "login.js"
        "logo.png" "messaging.css" "messaging.html" "messaging.js" "mobile-nav.js"
        "networking.html" "networking.js" "notifications.js" "privacy-policy.html"
        "profile.html" "profile.js" "school-profile.html" "school-profile.js"
        "schools.css" "schools.html" "schools.js" "students.js" "style.css"
        "supabase.js" "teacher_classroom_hub.js" "terms-and-conditions.html"
    ) do (
        if "%%~nxF"=="%%~E" set "KEEP=YES"
    )
    if "!KEEP!"=="NO" (
        echo REMOVING STALE: %%~nxF
        del /Q "%%F"
    )
)

echo.
echo === Verification ===
if exist "%DST%\index.html" (
    echo www\index.html EXISTS - OK
) else (
    echo ERROR: www\index.html MISSING
)

echo.
echo === SYNC COMPLETE ===
