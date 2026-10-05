import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1280, "height": 720})
        await page.goto("http://localhost:8000")
        await asyncio.sleep(2)

        await page.evaluate("""
            document.getElementById('crash-reason').textContent = 'Collision with Mountain / Terrain';
            document.getElementById('crash-overlay').classList.remove('hidden');
        """)

        await asyncio.sleep(0.5)
        await page.screenshot(path="/tmp/crash_overlay.png")
        await browser.close()

asyncio.run(run())
