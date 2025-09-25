#!/bin/bash

# Simple launcher script for the School Lunch Checker
# This makes it easy to run the application with a double-click

cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 first."
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if required packages are installed
if ! python3 -c "import requests, bs4" &> /dev/null; then
    echo "Installing required packages..."
    pip3 install -r requirements.txt
fi

# Run the lunch checker
echo "🍽️ Starting School Lunch Checker..."
python3 school_lunch_checker.py

# Keep terminal open if there was an error
if [ $? -ne 0 ]; then
    echo "An error occurred. Press Enter to exit..."
    read
fi
