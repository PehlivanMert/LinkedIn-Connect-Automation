import puppeteer from 'puppeteer';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    });
    const page = await browser.newPage();

    // Set the viewport to full screen based on the browser's screen size
    const { width, height } = await page.evaluate(() => {
        return { width: window.screen.width / 2, height: window.screen.height / 2 };
    });
    await page.setViewport({ width, height });

    const profileLinks = new Set<string>();
    const connectionRequestsSent: string[] = [];
    let currentPage = 1;
    const maxProfiles = 50; // Maximum number of profiles to process
    const maxRequests = 50; // Maximum number of connection requests to send
    const maxPages = 50; // Set maximum number of pages to scrape
    const searchValue = "team%20lead%20software%20developer%20turkey";

    try {
        console.log("Logging into LinkedIn...");
        await page.goto('https://www.linkedin.com/login');
        await page.waitForSelector('#username');
        await page.type('#username', `${process.env.LINKEDIN_USERNAME!}`);
        await page.type('#password', `${process.env.LINKEDIN_PASSWORD!}`);
        await page.click('.login__form_action_container button[type="submit"]');
        await page.waitForNavigation();

        console.log("Logged in successfully!");

        console.log("Waiting for 2FA...");
        await page.waitForTimeout(10000); // Wait for 2FA

        while (profileLinks.size < maxProfiles && currentPage <= maxPages) {
            console.log(`Searching for profiles on page ${currentPage}...`);
            const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${searchValue}&page=${currentPage}&origin=SWITCH_SEARCH_VERTICAL`;
            await page.goto(searchUrl);

            console.log("Waiting for search results to load...");
            try {
                await page.waitForSelector('ul.reusable-search__entity-result-list li', { timeout: 60000 });
                console.log("Search results loaded successfully.");
            } catch (e) {
                console.error("Error: Search results did not load within the timeout period.");
                break;
            }

            // Scroll to the bottom of the page to ensure all dynamic content is loaded
            await autoScroll(page);

            console.log("Extracting profile links...");
            const newProfileLinks: string[] = await page.evaluate(() => {
                const profileCards = document.querySelectorAll('ul.reusable-search__entity-result-list li');
                const links: string[] = [];
                profileCards.forEach(card => {
                    const linkElement = card.querySelector('a.app-aware-link') as HTMLAnchorElement;
                    const buttonElement = card.querySelector('button.artdeco-button--secondary span.artdeco-button__text') as HTMLElement;
                    if (linkElement && buttonElement && buttonElement.textContent.trim() === 'Bağlantı kur') {
                        links.push(linkElement.href);
                        console.log(`Found profile link: ${linkElement.href}`);
                    }
                });
                return links;
            });

            console.log(`Found ${newProfileLinks.length} profile links with 'Bağlantı kur' button`);
            newProfileLinks.forEach(link => profileLinks.add(link));

            console.log(`Collected ${profileLinks.size} profile links so far`);

            if (profileLinks.size >= maxProfiles) {
                console.log("Maximum profile links collected. Exiting search.");
                break;
            }

            currentPage++;
            console.log(`Navigating to page ${currentPage}...`);
            await page.waitForTimeout(7000); // Wait for 7 seconds before going to the next page
        }

        if (profileLinks.size >= maxProfiles) {
            console.log("Sending connection requests...");
            for (const profileLink of profileLinks) {
                if (connectionRequestsSent.length >= maxRequests) {
                    console.log("Maximum connection requests sent. Exiting.");
                    break;
                }

                try {
                    await page.goto(profileLink);
                    console.log(`Navigated to ${profileLink}`);

                    try {
                        await page.waitForSelector('button.artdeco-button--primary span.artdeco-button__text', { timeout: 5000 });
                        console.log(`Connect button found on ${profileLink}`);
                    } catch (e) {
                        console.log(`Connect button not found on ${profileLink}, skipping.`);
                        continue;
                    }

                    await page.evaluate(() => {
                        const connectButton = Array.from(document.querySelectorAll('button.artdeco-button--primary span.artdeco-button__text'))
                            .find(button => (button as HTMLElement).innerText.includes('Bağlantı kur'));
                        if (connectButton) {
                            (connectButton as HTMLElement).parentElement!.click();
                        }
                    });

                    try {
                        await page.waitForSelector('button.artdeco-button--primary.ml1 span.artdeco-button__text', { timeout: 5000 });
                        console.log(`Send now button found on ${profileLink}`);
                    } catch (e) {
                        console.log(`Send now button not found on ${profileLink}, skipping.`);
                        continue;
                    }

                    await page.evaluate(() => {
                        const sendNowButton = Array.from(document.querySelectorAll('button.artdeco-button--primary.ml1 span.artdeco-button__text'))
                            .find(button => (button as HTMLElement).innerText.includes('Not olmadan gönderin'));
                        if (sendNowButton) {
                            (sendNowButton as HTMLElement).parentElement!.click();
                        }
                    });

                    console.log(`Connection request sent to ${profileLink}`);
                    connectionRequestsSent.push(profileLink);

                    await page.waitForTimeout(3000); // Wait before the next request
                } catch (error) {
                    console.log(`Failed to send connection request to ${profileLink}: ${error}`);
                }
            }
        } else {
            console.log("Not enough profiles collected to start sending connection requests.");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        console.log("Browser closed.");
        console.log("Collected profile links:", Array.from(profileLinks));
        console.log("Connection requests sent:", connectionRequestsSent);
        // Optionally save to a file
        fs.writeFileSync('profileLinks.json', JSON.stringify(Array.from(profileLinks), null, 2));
    }

    await browser.close();
})();

// Helper function to auto scroll the page to ensure all dynamic content is loaded
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve, reject) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}


// Run the script
// npx ts-node lib/test.example.ts

// Note: Make sure to have the necessary environment variables set in the .env file
// LINKEDIN_USERNAME=your_username
// LINKEDIN_PASSWORD=your_password
