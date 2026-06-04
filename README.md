# 🍽️ Šolski Jedilnik Checker - Osnovna šola Trbovlje

A Progressive Web App to check your son's daily school lunch menu from Osnovna šola Trbovlje with just one click!

## 🌟 Features

- ✅ **Progressive Web App** - Install on your phone for native app-like experience
- 🔍 **Automatic menu detection** - Finds the current week's menu automatically
- 📅 **Smart date matching** - Shows today's specific lunch from the weekly menu
- 🏷️ **Allergen badges** - Interactive badges showing allergen information with tooltips
- 📱 **Mobile-first design** - Beautiful iOS-like interface optimized for phones
- 🔄 **Auto-refresh** - Menu loads automatically when you open the app
- 🇸🇮 **Slovenian language support** - Handles Slovenian day names and date formats
- ☁️ **Free hosting** - Deployed on Netlify for worldwide access

## 🏗️ Project Structure

```
SchoolLunchChecker/
├── frontend/          # All client-side code
│   ├── index.html     # Main PWA shell
│   ├── app.js         # Frontend fetch and rendering logic
│   ├── styles.css     # Small custom styles
│   ├── manifest.json  # PWA manifest
│   ├── sw.js         # Service worker
│   └── icon-*.png    # PWA icons
├── backend/           # Local Flask server and legacy Python scraper
│   ├── school_lunch_checker.py  # Main Python scraper
│   ├── app.py        # Local Flask development server
│   ├── requirements.txt  # Python dependencies
│   └── launch_*.sh   # Legacy launcher scripts
├── netlify/
│   └── functions/
│       └── menu.js    # Production serverless menu API
├── docs/             # All documentation
│   ├── USAGE_GUIDE.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── Web_App_Guide.md
└── netlify.toml      # Netlify deployment config
```

## 🚀 Quick Start

### Web App (Recommended)
Just visit the deployed web app - it works instantly on any device!

### Local Development
1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run local development server:**
   ```bash
   cd backend
   python app.py
   ```

3. **Open browser to:** `http://localhost:8080`

### Legacy CLI Mode
For command line usage:
```bash
cd backend
python school_lunch_checker.py --cli
```

## 🛠️ Development

### Code Quality & Linting

This project uses automated code quality tools to maintain consistent code style and catch potential issues.

#### Python (Backend)
We use `black` for code formatting and `flake8` for linting:

```bash
# Install development dependencies
cd backend
pip install -r requirements.txt

# Format code with black
black .

# Check formatting (without making changes)
black --check .

# Run linting with flake8
flake8 .
```

#### JavaScript (Frontend)
The frontend uses deterministic Node syntax checks for the static JavaScript files:

```bash
# Install dependencies
cd frontend
npm install

# Run linting
npm run lint
```

### Testing

This project includes comprehensive automated testing to ensure code quality and functionality.

#### Python (Backend)
We use `pytest` for backend testing:

```bash
# Install dependencies (includes pytest)
cd backend
pip install -r requirements.txt

# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run tests from project root
pytest backend/
```

#### JavaScript (Frontend)
Frontend tests run with Node and a small fake DOM:

```bash
# Install dependencies
cd frontend
npm install

# Run all tests
npm test
```

#### Full Test Suite
From the project root:
```bash
npm test
```

### Continuous Integration

The project includes automated CI/CD workflows that run on every push and pull request:

- **Python Testing**: Runs `pytest` on backend code
- **JavaScript Testing**: Runs Netlify parser tests and frontend rendering tests
- **Integration Testing**: Verifies that the app imports and basic functionality work

All checks must pass before code can be merged. Tests run automatically in GitHub Actions.

## How It Works

1. **Fetches the main menu page** from https://ostrbovlje.si/prehrana/
2. **Identifies the current week's menu** by parsing date ranges in menu links
3. **Downloads the current week's detailed menu**
4. **Extracts today's specific lunch** into structured meal data
5. **Displays the result** safely with text rendering and allergen badges

## Features Explained

- **Automatic Week Detection**: The tool automatically finds which of the 4 posted weekly menus corresponds to the current week
- **Day Matching**: Recognizes Slovenian day names (ponedeljek, torek, sreda, četrtek, petek)
- **Date Formatting**: Handles various date formats used on the school website
- **Error Handling**: Gracefully handles network issues and website changes
- **Fallback Options**: If today's specific menu can't be found, shows the full weekly menu

## Troubleshooting

- **No internet connection**: Make sure you have a stable internet connection
- **Website changes**: If the school website structure changes, the tool might need updates
- **Menu not found**: Check if the school has posted the current week's menu

## Technical Details

- **Frontend**: Static HTML, CSS, and JavaScript PWA
- **Production API**: Netlify Node function using Cheerio
- **Local Backend**: Flask + Python scraper
- **Date Handling**: Europe/Ljubljana-aware production API dates

## Example Output

```
🍽️ Kosilo za torek, 24.09.2025
📋 Jedilnik: Jedilnik 22.9.–26.9. 2025

TOREK, 24.09.2025
🥗 Malica: Sadje
🍝 Kosilo: Špageti z mesno omako
🥛 Napoj: Čaj
🍎 Popoldanska malica: Jogurt z müslijem
```

## License

This tool is created for educational purposes to help students and parents easily access school lunch information.
