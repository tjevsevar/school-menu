#!/bin/bash

# macOS .command file for easy desktop access
# Double-click this file to run the School Lunch Checker

cd "$(dirname "$0")"
python3 school_lunch_checker.py --cli

# Keep terminal open to see results
echo ""
echo "Press any key to close..."
read -n 1
