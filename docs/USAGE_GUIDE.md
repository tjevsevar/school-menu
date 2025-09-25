# 🍽️ School Lunch Checker - Usage Guide

## Quick Start for Your Son

### Easiest Way (One-Click):
1. **On macOS**: Double-click `Lunch_Checker.command`
2. **On Windows**: Double-click `launch_lunch_checker.bat`
3. **On Linux**: Double-click `launch_lunch_checker.sh`

### Alternative Ways:

#### Method 1: Command Line
Open Terminal/Command Prompt and run:
```bash
python3 school_lunch_checker.py --cli
```

#### Method 2: GUI Mode (if available)
```bash
python3 school_lunch_checker.py
```

## What You'll See

The application will show you something like this:

```
🔍 Iščem današnji jedilnik...
📋 Našel jedilnik: Jedilnik 22.9.–26.9. 2025

==================================================
📅 Celotni jedilnik za ta teden
🔍 Danes je sreda, 24.09.2025
📋 Jedilnik 22.9.–26.9. 2025

SREDA, 24.09.2025
🥗 MALICA: črna žemlja–G, suha salama (govedina, svinjina), sir–L, rdeča redkev, voda
🍝 KOSILO: piščančja pleskavica, pretlačen krompir, rdeča pesa in cvetača, voda
🍎 POP. MALICA: ajdov kruh z orehi–G, O (orehi), skutina blazinica–G, L, J, mleko–L
==================================================
```

## Understanding the Output

- **🔍 Iščem današnji jedilnik...** = "Searching for today's menu..."
- **📋 Našel jedilnik** = "Found menu"
- **📅 Celotni jedilnik** = "Complete menu for this week"
- **🔍 Danes je** = "Today is"
- **🥗 MALICA** = Morning snack
- **🍝 KOSILO** = Lunch
- **🍎 POP. MALICA** = Afternoon snack

## Allergen Codes
- **G** = Gluten
- **L** = Lactose/Milk
- **J** = Eggs
- **S** = Soy
- **O** = Nuts
- **R** = Fish
- **Z** = Celery
- And more...

## Troubleshooting

### Problem: "Could not find current week's menu"
**Solution**: The school might not have posted this week's menu yet, or there might be a website issue.

### Problem: Network errors
**Solution**: Check your internet connection.

### Problem: Script doesn't run
**Solution**: Make sure Python 3 is installed and the requirements are installed:
```bash
pip3 install -r requirements.txt
```

## Creating a Desktop Shortcut

### On macOS:
1. Copy `Lunch_Checker.command` to your Desktop
2. Double-click it whenever you want to check lunch

### On Windows:
1. Copy `launch_lunch_checker.bat` to your Desktop
2. Double-click it whenever you want to check lunch

### On Linux:
1. Copy `launch_lunch_checker.sh` to your Desktop
2. Make sure it's executable: `chmod +x launch_lunch_checker.sh`
3. Double-click it whenever you want to check lunch

## Daily Routine

1. **Morning**: Double-click the launcher file
2. **Wait 2-3 seconds** for the script to fetch the menu
3. **Read today's lunch** and plan accordingly!

## Tips

- The script automatically finds the current week's menu from the 4 posted menus
- It knows what day today is and tries to show only today's meal
- If it can't find today specifically, it shows the whole week's menu
- The script works in Slovenian since that's the school's language

## Support

If something doesn't work:
1. Check your internet connection
2. Make sure Python 3 is installed
3. Try running: `pip3 install -r requirements.txt`
4. If still having issues, run in CLI mode: `python3 school_lunch_checker.py --cli`

---

**Enjoy your daily lunch checking! 🍽️**
