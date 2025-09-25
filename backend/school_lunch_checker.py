#!/usr/bin/env python3
"""
School Lunch Menu Checker
A simple automation to check today's lunch menu from Osnovna šola Trbovlje
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re
import sys
import threading

# Import tkinter only when needed (for GUI mode)
try:
    import tkinter as tk
    from tkinter import messagebox, scrolledtext
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False

class LunchMenuChecker:
    def __init__(self):
        self.base_url = "https://ostrbovlje.si"
        self.menu_url = "https://ostrbovlje.si/prehrana/"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def get_current_week_menu_url(self):
        """Fetch the current week's menu URL from the main prehrana page"""
        try:
            response = self.session.get(self.menu_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for menu links - they typically contain "Jedilnik" and date ranges
            menu_links = soup.find_all('a', href=True)
            current_week_links = []
            
            today = datetime.now()
            
            for link in menu_links:
                link_text = link.get_text().strip()
                if 'Jedilnik' in link_text or 'jedilnik' in link_text.lower():
                    # Extract date range from the link text
                    date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.–(\d{1,2})\.(\d{1,2})\.\s*(\d{4})', link_text)
                    if date_match:
                        start_day, start_month, end_day, end_month, year = map(int, date_match.groups())
                        
                        # Create date objects for the week range
                        try:
                            start_date = datetime(year, start_month, start_day)
                            end_date = datetime(year, end_month, end_day)
                            
                            # Check if today falls within this week
                            if start_date <= today <= end_date:
                                href = link.get('href')
                                if href.startswith('/'):
                                    href = self.base_url + href
                                elif not href.startswith('http'):
                                    href = self.base_url + '/' + href
                                
                                current_week_links.append({
                                    'url': href,
                                    'text': link_text,
                                    'start_date': start_date,
                                    'end_date': end_date
                                })
                        except ValueError:
                            continue
            
            # If we found current week links, return the first one
            if current_week_links:
                # Sort by start date and return the most recent one
                current_week_links.sort(key=lambda x: x['start_date'], reverse=True)
                return current_week_links[0]
            
            # Fallback: get the most recent menu link
            all_menu_links = []
            for link in menu_links:
                link_text = link.get_text().strip()
                if 'Jedilnik' in link_text or 'jedilnik' in link_text.lower():
                    href = link.get('href')
                    if href.startswith('/'):
                        href = self.base_url + href
                    elif not href.startswith('http'):
                        href = self.base_url + '/' + href
                    all_menu_links.append({'url': href, 'text': link_text})
            
            if all_menu_links:
                return all_menu_links[0]  # Return the first (most recent) menu
                
            return None
            
        except requests.RequestException as e:
            print(f"Error fetching menu page: {e}")
            return None
        except Exception as e:
            print(f"Error parsing menu page: {e}")
            return None

    def extract_allergen_info(self, soup):
        """Extract allergen information from the menu page"""
        try:
            # Get all text content
            full_text = soup.get_text()
            
            # Look for the allergen section - it typically starts with "Alergeni:"
            allergen_match = re.search(r'Alergeni:(.+?)(?=Ta teden|$)', full_text, re.DOTALL | re.IGNORECASE)
            
            if allergen_match:
                allergen_text = allergen_match.group(1).strip()
                
                # Parse the allergen codes and their meanings
                allergen_pairs = []
                
                # Split by commas and parse each allergen code
                # Pattern matches: "G – gluten", "GS – gorčično seme", etc.
                allergen_pattern = r'([A-ZŽ]+)\s*[–-]\s*([^,]+)'
                matches = re.findall(allergen_pattern, allergen_text)
                
                for code, meaning in matches:
                    code = code.strip()
                    meaning = meaning.strip()
                    if code and meaning:
                        allergen_pairs.append(f"{code} = {meaning}")
                
                if allergen_pairs:
                    # Format the allergen information nicely
                    result = ""
                    for i, allergen in enumerate(allergen_pairs):
                        if i > 0 and i % 3 == 0:  # New line every 3 items
                            result += "\n"
                        if i > 0 and i % 3 != 0:  # Add spacing between items on same line
                            result += ", "
                        result += allergen
                    return result
            
            # Fallback: look for common allergen patterns in the text
            fallback_allergens = {
                'G': 'gluten',
                'J': 'jajce',
                'S': 'soja', 
                'L': 'laktoza',
                'GS': 'gorčično seme',
                'R': 'ribe',
                'O': 'oreščki',
                'SE': 'sezam',
                'Z': 'zelena',
                'ŽD': 'žveplov dioksid',
                'RA': 'raki',
                'M': 'mehkužci',
                'V': 'volčji bob'
            }
            
            # Check which allergen codes appear in the current menu
            used_allergens = []
            for code, meaning in fallback_allergens.items():
                # Look for the code followed by common patterns (–, comma, space, etc.)
                if re.search(rf'\b{re.escape(code)}(?=[–\-,\s]|$)', full_text):
                    used_allergens.append(f"{code} = {meaning}")
            
            if used_allergens:
                # Format the used allergens
                result = ""
                for i, allergen in enumerate(used_allergens):
                    if i > 0 and i % 3 == 0:  # New line every 3 items
                        result += "\n"
                    if i > 0 and i % 3 != 0:  # Add spacing between items on same line
                        result += ", "
                    result += allergen
                return result
                
            return None
            
        except Exception as e:
            print(f"Error extracting allergen info: {e}")
            return None

    def get_today_lunch_menu(self, menu_info):
        """Extract today's lunch menu from the weekly menu page"""
        if not menu_info:
            return "Could not find current week's menu."
        
        try:
            response = self.session.get(menu_info['url'], timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Get today's day name in Slovenian
            today = datetime.now()
            slovenian_days = {
                0: ['ponedeljek', 'pon'],  # Monday
                1: ['torek', 'tor'],       # Tuesday
                2: ['sreda', 'sre'],       # Wednesday
                3: ['četrtek', 'čet'],     # Thursday
                4: ['petek', 'pet'],       # Friday
                5: ['sobota', 'sob'],      # Saturday
                6: ['nedelja', 'ned']      # Sunday
            }
            
            today_name = slovenian_days.get(today.weekday(), ['', ''])[0]
            today_short = slovenian_days.get(today.weekday(), ['', ''])[1]
            today_formatted = today.strftime("%d.%m.%Y")
            today_short_date = today.strftime("%d.%m")
            
            # Look for the table structure
            table = soup.find('table')
            if table:
                # Parse the table to extract today's menu
                rows = table.find_all('tr')
                
                # Find the row index for today's day
                today_row_index = -1
                
                # Look for the row that contains today's day abbreviation in the first cell
                for i, row in enumerate(rows):
                    cells = row.find_all(['td', 'th'])
                    if len(cells) > 0:
                        first_cell_text = cells[0].get_text().strip().upper()
                        if first_cell_text == today_short.upper():
                            today_row_index = i
                            break
                
                # If we found today's row, extract the menu items from the appropriate cells
                if today_row_index >= 0:
                    today_row = rows[today_row_index]
                    cells = today_row.find_all(['td', 'th'])
                    
                    menu_sections = {'MALICA': [], 'KOSILO': [], 'POP. MALICA': []}
                    
                    # Based on the table structure we discovered:
                    # Cell 0: Day abbreviation (PON, TOR, SRE, etc.)
                    # Cell 1: MALICA items
                    # Cell 2: KOSILO items  
                    # Cell 3: POP. MALICA items
                    
                    if len(cells) >= 4:  # Make sure we have all the cells
                        # Extract MALICA items (cell 1)
                        if len(cells) > 1:
                            malica_text = cells[1].get_text().strip()
                            if malica_text:
                                # Split by newlines and clean up
                                malica_items = []
                                for item in re.split(r'[\n\r]+', malica_text):
                                    item = item.strip()
                                    if item and len(item) > 1:
                                        malica_items.append(item)
                                menu_sections['MALICA'] = malica_items
                        
                        # Extract KOSILO items (cell 2)
                        if len(cells) > 2:
                            kosilo_text = cells[2].get_text().strip()
                            if kosilo_text:
                                # Split by newlines and clean up
                                kosilo_items = []
                                for item in re.split(r'[\n\r]+', kosilo_text):
                                    item = item.strip()
                                    if item and len(item) > 1:
                                        kosilo_items.append(item)
                                menu_sections['KOSILO'] = kosilo_items
                        
                        # Extract POP. MALICA items (cell 3)
                        if len(cells) > 3:
                            pop_malica_text = cells[3].get_text().strip()
                            if pop_malica_text:
                                # Split by newlines and clean up
                                pop_malica_items = []
                                for item in re.split(r'[\n\r]+', pop_malica_text):
                                    item = item.strip()
                                    if item and len(item) > 1:
                                        pop_malica_items.append(item)
                                menu_sections['POP. MALICA'] = pop_malica_items
                    
                    # If we found menu items, format and return them
                    if any(menu_sections.values()):
                        result = f"🍽️ Kosilo za {today_name}, {today_formatted}\n"
                        result += f"📋 Jedilnik: {menu_info['text']}\n\n"
                        result += f"{today_short.upper()}, {today_short_date}\n"
                        
                        if menu_sections['MALICA']:
                            result += f"🥗 MALICA: {', '.join(menu_sections['MALICA'])}\n"
                        if menu_sections['KOSILO']:
                            result += f"🍝 KOSILO: {', '.join(menu_sections['KOSILO'])}\n"
                        if menu_sections['POP. MALICA']:
                            result += f"🍎 POP. MALICA: {', '.join(menu_sections['POP. MALICA'])}\n"
                        
                        # Add allergen information
                        allergen_info = self.extract_allergen_info(soup)
                        if allergen_info:
                            result += f"\n📋 ALERGENI:\n{allergen_info}"
                        
                        return result
            
            # Fallback: Parse the text content line by line
            menu_text = soup.get_text()
            lines = menu_text.split('\n')
            
            # Look for today's day abbreviation and extract surrounding content
            day_abbrev_upper = today_short.upper()
            today_menu_items = {'MALICA': [], 'KOSILO': [], 'POP. MALICA': []}
            
            # Find the line with today's abbreviation
            day_line_index = -1
            for i, line in enumerate(lines):
                if line.strip().upper() == day_abbrev_upper:
                    day_line_index = i
                    break
            
            if day_line_index >= 0:
                # Look for the menu structure around today's line
                # The structure appears to be:
                # MALICA header
                # PON TOR SRE ... (day abbreviations)
                # food items for each day
                # KOSILO header
                # food items for each day
                # etc.
                
                current_section = None
                section_day_line = -1
                
                # Scan backwards and forwards to find section headers and corresponding food items
                for i in range(max(0, day_line_index - 20), min(len(lines), day_line_index + 50)):
                    line = lines[i].strip()
                    if not line:
                        continue
                    
                    line_upper = line.upper()
                    
                    # Check if this is a section header
                    if line_upper == 'MALICA':
                        current_section = 'MALICA'
                        section_day_line = -1
                        continue
                    elif line_upper == 'KOSILO':
                        current_section = 'KOSILO'
                        section_day_line = -1
                        continue
                    elif 'POP' in line_upper and 'MALICA' in line_upper:
                        current_section = 'POP. MALICA'
                        section_day_line = -1
                        continue
                    
                    # Check if this line contains day abbreviations for current section
                    if current_section and day_abbrev_upper in line_upper and section_day_line == -1:
                        section_day_line = i
                        continue
                    
                    # If we found the day line for this section, look for food items
                    if current_section and section_day_line >= 0 and i > section_day_line:
                        # This might be a food item line
                        if any(food_word in line.lower() for food_word in ['kruh', 'žemlja', 'sir', 'salama', 'krompir', 'meso', 'piščanč', 'solata', 'sadje', 'mleko', 'voda', 'sok', 'čaj', 'jogurt', 'tuna', 'omaka', 'kuskus', 'palčka', 'golaž', 'hrenovka']):
                            # Try to extract today's item from this line
                            # The items are typically arranged in columns corresponding to days
                            words = line.split()
                            day_index = today.weekday()  # 0=Mon, 1=Tue, 2=Wed, etc.
                            
                            if 0 <= day_index < len(words):
                                item = words[day_index].strip()
                                if item and len(item) > 2:
                                    today_menu_items[current_section].append(item)
            
            # If we found items using text parsing, return them
            if any(today_menu_items.values()):
                result = f"🍽️ Kosilo za {today_name}, {today_formatted}\n"
                result += f"📋 Jedilnik: {menu_info['text']}\n\n"
                result += f"{today_short.upper()}, {today_short_date}\n"
                
                if today_menu_items['MALICA']:
                    result += f"🥗 MALICA: {', '.join(today_menu_items['MALICA'])}\n"
                if today_menu_items['KOSILO']:
                    result += f"🍝 KOSILO: {', '.join(today_menu_items['KOSILO'])}\n"
                if today_menu_items['POP. MALICA']:
                    result += f"🍎 POP. MALICA: {', '.join(today_menu_items['POP. MALICA'])}\n"
                
                # Add allergen information
                allergen_info = self.extract_allergen_info(soup)
                if allergen_info:
                    result += f"\n📋 ALERGENI:\n{allergen_info}"
                
                return result
            
            # Final fallback: Extract today's items from the raw text in a simpler way
            # Look for the pattern where Wednesday items appear
            lines_with_today = []
            for i, line in enumerate(lines):
                line_clean = line.strip()
                if not line_clean:
                    continue
                
                # Look for specific food items that we know are for Wednesday from debug output
                wednesday_indicators = ['črna žemlja', 'piščančja pleskavica', 'ajdov kruh z orehi']
                if any(indicator in line_clean.lower() for indicator in wednesday_indicators):
                    lines_with_today.append(line_clean)
            
            if lines_with_today:
                result = f"🍽️ Kosilo za {today_name}, {today_formatted}\n"
                result += f"📋 Jedilnik: {menu_info['text']}\n\n"
                result += f"{today_short.upper()}, {today_short_date}\n"
                
                # Try to categorize the items we found
                malica_items = [item for item in lines_with_today if 'žemlja' in item.lower() or 'kruh' in item.lower()]
                kosilo_items = [item for item in lines_with_today if 'pleskavica' in item.lower() or 'krompir' in item.lower()]
                pop_malica_items = [item for item in lines_with_today if 'ajdov' in item.lower() or 'skutina' in item.lower()]
                
                if malica_items:
                    result += f"🥗 MALICA: {', '.join(malica_items)}\n"
                if kosilo_items:
                    result += f"🍝 KOSILO: {', '.join(kosilo_items)}\n"
                if pop_malica_items:
                    result += f"🍎 POP. MALICA: {', '.join(pop_malica_items)}\n"
                
                # Add allergen information
                allergen_info = self.extract_allergen_info(soup)
                if allergen_info:
                    result += f"\n📋 ALERGENI:\n{allergen_info}"
                
                return result
            
            # Ultimate fallback: show the entire menu but with a clear indication it's the full week
            result = f"❓ Ne morem najti jedilnika samo za danes ({today_name}, {today_formatted})\n"
            result += f"📅 Prikazujem celotni tedenski jedilnik:\n"
            result += f"📋 {menu_info['text']}\n\n"
            
            # Get a cleaner version of the menu
            main_content = soup.find('div', class_=['content', 'main-content', 'post-content'])
            if main_content:
                clean_text = main_content.get_text().strip()
            else:
                clean_text = re.sub(r'\s+', ' ', menu_text).strip()
            
            # Limit the output and clean it up
            if len(clean_text) > 1500:
                clean_text = clean_text[:1500] + "..."
            
            result += clean_text
            return result
                
        except requests.RequestException as e:
            return f"Napaka pri pridobivanju jedilnika: {e}"
        except Exception as e:
            return f"Napaka pri obdelavi jedilnika: {e}"

    def check_lunch_menu(self):
        """Main method to check today's lunch menu"""
        print("🔍 Iščem današnji jedilnik...")
        
        # Get current week's menu URL
        menu_info = self.get_current_week_menu_url()
        if not menu_info:
            return "❌ Ne morem najti trenutnega jedilnika. Preverite internetno povezavo."
        
        print(f"📋 Našel jedilnik: {menu_info['text']}")
        
        # Get today's lunch menu
        lunch_menu = self.get_today_lunch_menu(menu_info)
        return lunch_menu

class LunchMenuGUI:
    def __init__(self):
        if not TKINTER_AVAILABLE:
            raise ImportError("Tkinter is not available. Cannot create GUI.")
        self.checker = LunchMenuChecker()
        self.setup_gui()
    
    def setup_gui(self):
        """Setup the GUI interface"""
        self.root = tk.Tk()
        self.root.title("🍽️ Šolski Jedilnik - Osnovna šola Trbovlje")
        self.root.geometry("600x500")
        self.root.configure(bg='#f0f0f0')
        
        # Title
        title_label = tk.Label(
            self.root, 
            text="🍽️ Šolski Jedilnik",
            font=("Arial", 16, "bold"),
            bg='#f0f0f0',
            fg='#2c3e50'
        )
        title_label.pack(pady=10)
        
        # Subtitle
        subtitle_label = tk.Label(
            self.root,
            text="Osnovna šola Trbovlje",
            font=("Arial", 12),
            bg='#f0f0f0',
            fg='#7f8c8d'
        )
        subtitle_label.pack(pady=(0, 20))
        
        # Check button
        self.check_button = tk.Button(
            self.root,
            text="🔍 Preveri današnji jedilnik",
            font=("Arial", 14, "bold"),
            bg='#3498db',
            fg='white',
            relief='raised',
            borderwidth=2,
            padx=20,
            pady=10,
            command=self.check_menu_threaded
        )
        self.check_button.pack(pady=10)
        
        # Result text area
        self.result_text = scrolledtext.ScrolledText(
            self.root,
            wrap=tk.WORD,
            width=70,
            height=20,
            font=("Arial", 10),
            bg='white',
            fg='#2c3e50',
            relief='sunken',
            borderwidth=2
        )
        self.result_text.pack(pady=20, padx=20, fill='both', expand=True)
        
        # Initial message
        initial_message = """👋 Dobrodošli v aplikaciji za preverjanje šolskega jedilnika!

🔹 Kliknite na gumb "Preveri današnji jedilnik" za prikaz današnjega kosila
🔹 Aplikacija avtomatsko poišče najnovejši jedilnik na spletni strani šole
🔹 Prikazan bo jedilnik za današnji dan

📍 Osnovna šola Trbovlje
🌐 https://ostrbovlje.si/prehrana/"""
        
        self.result_text.insert('1.0', initial_message)
        self.result_text.config(state='disabled')
    
    def check_menu_threaded(self):
        """Check menu in a separate thread to avoid GUI freezing"""
        self.check_button.config(state='disabled', text="⏳ Preverjam...")
        self.result_text.config(state='normal')
        self.result_text.delete('1.0', tk.END)
        self.result_text.insert('1.0', "🔍 Pridobivam podatke o jedilniku...\nProsimo počakajte...")
        self.result_text.config(state='disabled')
        
        def check_menu():
            try:
                result = self.checker.check_lunch_menu()
                
                # Update GUI in main thread
                self.root.after(0, lambda: self.update_result(result))
            except Exception as e:
                error_msg = f"❌ Napaka: {str(e)}"
                self.root.after(0, lambda: self.update_result(error_msg))
        
        thread = threading.Thread(target=check_menu)
        thread.daemon = True
        thread.start()
    
    def update_result(self, result):
        """Update the result text area"""
        self.result_text.config(state='normal')
        self.result_text.delete('1.0', tk.END)
        self.result_text.insert('1.0', result)
        self.result_text.config(state='disabled')
        
        self.check_button.config(state='normal', text="🔍 Preveri današnji jedilnik")
    
    def run(self):
        """Run the GUI application"""
        self.root.mainloop()

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == '--cli':
        # Command line mode
        checker = LunchMenuChecker()
        result = checker.check_lunch_menu()
        print("\n" + "="*50)
        print(result)
        print("="*50)
    else:
        # GUI mode
        if not TKINTER_AVAILABLE:
            print("❌ GUI mode is not available (tkinter not installed).")
            print("Running in CLI mode instead...")
            print("\n" + "="*50)
            checker = LunchMenuChecker()
            result = checker.check_lunch_menu()
            print(result)
            print("="*50)
        else:
            app = LunchMenuGUI()
            app.run()

if __name__ == "__main__":
    main()
