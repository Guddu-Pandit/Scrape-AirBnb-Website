# Airbnb Scraper

A powerful and stealthy web scraper built with Playwright to extract property listings from Airbnb. This tool is designed to bypass common anti-bot measures and provides clean, structured data in JSON format.

## 🚀 Features

- **Automated Search**: Searches for any location directly via Google to mimic human behavior.
- **Stealth Mode**: 
  - Rotates User-Agents and Viewports.
  - Randomizes Locales and Timezones.
  - Mimics human typing with variable delays.
  - Bypasses `navigator.webdriver` detection.
- **Smart Extraction**: Automatically extracts property titles, descriptions, prices, ratings, and links.
- **Anti-Bot Navigation**: Includes specialized logic to handle "Got it" popups and detect CAPTCHAs.
- **Clean Output**: Saves extracted data to a well-formatted `output.json` file.

## 🛠️ Tech Stack

- **Node.js**: The runtime environment.
- **Playwright**: For browser automation and data extraction.
- **FileSystem (fs)**: For saving the output data.
- **Readline**: For interactive user input.

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd scrapeAirbnb
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

## 🖥️ Usage

1. **Start the scraper**:
   ```bash
   npm start
   ```

2. **Enter your search query**:
   When prompted `What would you want to search? 👉`, enter a query like `airbnb in Paris` or `beach houses in Malibu`.

3. **Monitor progress**:
   The scraper will open a browser window, search Google, navigate to Airbnb, scroll through results, and extract data.

4. **View results**:
   The extracted data will be displayed in the terminal and saved to `output.json`.

## 📄 Output Format

The scraper extracts the following fields for each property:
- `title`: The name of the listing.
- `description`: A brief summary of the property.
- `price`: The nightly price (e.g., ₹12,345, $150).
- `rating`: The average user rating.
- `link`: The direct URL to the listing.

Example `output.json`:
```json
[
  {
    "title": "Eco-friendly Cabin in the Woods",
    "description": "Entire cabin · 2 beds",
    "price": "₹5,000",
    "rating": "4.92",
    "link": "https://www.airbnb.com/rooms/12345678"
  }
]
```

## ⚠️ Disclaimer

This tool is for educational purposes only. Please ensure you comply with Airbnb's Terms of Service and local regulations regarding web scraping. Use responsibly.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


---

Developed with ❤️ by [Guddu-Pandit](https://github.com/Guddu-Pandit)

