@echo off
REM Simple launcher script for the School Lunch Checker (Windows)
REM This makes it easy to run the application with a double-click

cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH. Please install Python first.
    pause
    exit /b 1
)

REM Check if required packages are installed
python -c "import requests, bs4" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing required packages...
    pip install -r requirements.txt
)

REM Run the lunch checker
echo 🍽️ Starting School Lunch Checker...
python school_lunch_checker.py

REM Keep command prompt open if there was an error
if %errorlevel% neq 0 (
    echo An error occurred. Press any key to exit...
    pause >nul
)
