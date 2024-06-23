<p align="center">
  
</p>
<h1 align="center">Welcome to Linkedin Scraper</h1>
<p align="center">
  <a href="https://opensource.org/licenses/MIT" target="_blank">
    <img alt="License: MIT License" src="https://img.shields.io/badge/License-MIT License-yellow.svg" />
  </a>
</p>

Here you can find secure scraping using Puppeteer for different Linkedin actions

- [x] Login
- [x] Scrape profiles: Sales Nav / Normal
- [x] Connection Request
- [x] Follow message
- [x] Endorse Profile
- [x] Visit Profile
- [x] Like posts
- [x] Random Engagement

## Install

```sh
npm install linvo-scraper puppeteer --save
```

## Usage

```javascript
import * as LinvoScraper from "linvo-scraper";
import * as puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  const cdp = await page.target().createCDPSession();

  // that's the res Linvo is working in production
  await page.setViewport({
    width: 1440,
    height: 900,
  });

  // add ghost-cursor for maximum safety
  await LinvoScraper.tools.loadCursor(page, true);

  // Login with Linkedin
  const { token } = await LinvoScraper.services.login.process(page, cdp, {
    user: "bang@linvo.io",
    password: "superStrongPass!!%",
  });

  // set cookies
  await page.setCookie({
    name: "li_at",
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "None",
    priority: "Medium",
    path: "/",
    domain: ".www.linkedin.com",
  });

  await LinvoScraper.services.connect.process(page, cdp, {
    message: "Hi Nevo! Let's connect!",
    url: "https://www.linkedin.com/in/nevo-david/",
  });
})();
```
