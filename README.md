# StudySync AI — IPE Project Prototype

A responsive student productivity web app built with HTML, CSS, and vanilla JavaScript. No build tools or API keys are required for the local prototype.

## Features
- Overview dashboard with task counts, completion rate, and due-soon summary
- Assignment CRUD: add, edit, complete, delete, search, and filter
- Smart study-plan generator (local scheduling logic; not an external generative-AI API)
- Focus timer with 25-minute focus, 5-minute break, and 15-minute break presets
- Browser localStorage persistence
- Responsive dark navy / blue / purple design

## Run on Windows
1. Extract the ZIP to a folder such as `C:\Users\YourName\Desktop\StudySyncAI`.
2. Open Visual Studio Code.
3. Choose **File → Open Folder** and select the extracted `StudySyncAI` folder.
4. Open `index.html`.
5. If you have the VS Code **Live Server** extension installed, right-click `index.html` and choose **Open with Live Server**. Otherwise, double-click `index.html` in File Explorer to open it in Chrome.
6. Add a test assignment, refresh the page, and verify it remains saved in that browser.

## Deployment (GitHub Pages)
1. Create a GitHub repository named `studysync-ai`.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under build/deployment, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for GitHub Pages to publish. The URL normally resembles `https://YOUR-USERNAME.github.io/studysync-ai/`.
6. Open the exact URL shown by GitHub Pages and test it in a private/incognito window. Do not put a guessed URL in the report.

## Important project honesty notes
- The application itself currently uses local browser logic for the study schedule; it does not call a live AI API.
- AI-assisted development is evidenced through the prompts you use to plan, generate, test, and improve the app. Capture genuine screenshots of your prompts and actual testing.
- Tasks are stored in localStorage on the current browser/device, not in a cloud database or shared account.
- The Google Fonts link needs internet access; the app's layout and functionality still work if fonts fail to load.

## Suggested real test cases
1. Add an assignment with a title, subject, future due date, and High priority.
2. Confirm it appears in the assignment list and dashboard.
3. Refresh the page and confirm it remains.
4. Mark it complete and confirm the completion count updates.
5. Search by subject and filter by priority.
6. Edit its title, then delete it after confirming the browser prompt.
7. Generate a 3-day plan with at least two subjects and confirm sessions appear.
8. Print the generated plan and confirm the print preview is readable.
9. Start, pause, reset, and switch the focus timer presets.
10. Resize the browser to a phone-width viewport and inspect the layout.

Record actual pass/fail outcomes after you perform these tests. Do not report a test as passed before trying it.
