# UNSCRAMBLE THE WORDS

A lightweight, responsive Friday activity built with plain HTML, CSS, and JavaScript. It works without a backend or build step.

## Run it

Open `index.html` in a current web browser. For local sharing across devices, serve this folder from a static web host (for example, GitHub Pages or Netlify) and share the resulting page link in WhatsApp. The Google Fonts stylesheet uses an internet connection; the system sans-serif fallback works offline.

## Play

Choose **PLAY NOW**, enter a name or nickname, and submit the registration form. Each of the five words has one answer submission and its own 15-second countdown, reset to 15 for each new word. Enter the answer and select **CHECK** (or press Enter). Every submission locks the answer and advances to the next word; a correct answer adds 20 points, while an incorrect answer adds none. An unanswered word is counted when its timer expires or an empty answer is submitted. The final result shows the player's name, score out of 100, correct answers out of 5, unanswered words, and total elapsed time. After all five rounds, the game reveals **START**. Select **SHOW ME THE MESSAGE** to see the English and Arabic encouragement; select **VIEW MY SCORE** there to return to the same final results as often as you like. Reviewing the score does not start a new game or submit another Google Sheets result. Games cannot be restarted after registration.

## Files

- `index.html` — screens, puzzle cards, final message, and CSS illustration
- `styles.css` — responsive visual design, transitions, and animations
- `game.js` — answer checking, solved-word tracking, progress, and screen flow

## Optional Google Sheets results

Each completed game sends one JSON result to the configured Apps Script Web App. The request uses `Content-Type: text/plain;charset=utf-8` with `mode: 'no-cors'` and includes `playerName`, `finalScore`, `correctAnswers`, `unanswered`, and `totalTime` in seconds. Apps Script adds the submission date and time. Each game adds one row to a `Results` sheet tab, created automatically if it does not exist. The game does not wait for the request, so a connection failure does not block the results screen.

### Configure the spreadsheet

1. Create or open a Google spreadsheet.
2. Copy the spreadsheet ID from its URL. It is the text between `/d/` and `/edit` in `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
3. Open [script.google.com](https://script.google.com), create a new project, and replace the editor contents with this code. Replace `PASTE_SPREADSHEET_ID_HERE` with the ID from step 2.

```javascript
const SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';

function doPost(e) {
	const result = JSON.parse((e && e.postData && e.postData.contents) || '{}');
	const playerName = String(result.playerName || '').trim();
	const finalScore = Number(result.finalScore);
	const correctAnswers = Number(result.correctAnswers);
	const unanswered = Number(result.unanswered);
	const totalTime = Number(result.totalTime);

	if (!playerName || !Number.isInteger(finalScore) || !Number.isInteger(correctAnswers) ||
			!Number.isInteger(unanswered) || !Number.isInteger(totalTime) ||
			finalScore !== correctAnswers * 20 || finalScore < 0 || finalScore > 100 ||
			correctAnswers < 0 || correctAnswers > 5 || unanswered < 0 ||
			unanswered > 5 || correctAnswers + unanswered > 5 || totalTime < 0) {
		return ContentService.createTextOutput('Invalid result');
	}

	const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
	const sheet = spreadsheet.getSheetByName('Results') || spreadsheet.insertSheet('Results');
	if (sheet.getLastRow() === 0) {
		sheet.appendRow(['Submission Date/Time', 'Player Name', 'Final Score', 'Correct Answers', 'Unanswered Words', 'Total Time (seconds)']);
	}
	sheet.appendRow([new Date(), playerName, finalScore, correctAnswers, unanswered, totalTime]);
	return ContentService.createTextOutput('OK');
}
```

### Deploy the Web App

1. In the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon, choose **Web app**, and set **Execute as** to **Me**.
3. Set **Who has access** to **Anyone**, then click **Deploy**. This access setting is needed so visitors to the static GitHub Pages game can submit results. The Web App URL is public, so anyone who has it can submit scores; connect only a sheet intended for public game results and do not store sensitive data in it.
4. Complete Google's authorization prompts. Copy the Web App URL ending in `/exec` from the deployment dialog.
5. Ensure the deployed Apps Script version uses the JSON-reading `doPost` code above. If the current deployment still reads `e.parameter`, edit the deployment and publish a new version of the updated script.
6. The supplied Web App URL is already configured in `game.js`. If you deploy a different Web App, replace `SHEETS_WEB_APP_URL` with its `/exec` URL.
7. Save and publish the game files to GitHub Pages. After a game finishes, open the spreadsheet's `Results` tab to see appended rows. The browser's no-cors JSON request cannot expose Google's response; connection failures do not block the results screen.

To update the script later, use **Deploy** > **Manage deployments**, edit the existing deployment, select a new version, and deploy it. Keep the same Web App URL in `game.js` unless you create a new deployment URL.
