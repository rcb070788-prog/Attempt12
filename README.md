
# Live Testing & Netlify Guide

Your site is now connected to GitHub and Netlify. Here is how to test it:

## 1. Test the "Drop-in" Dashboard
To verify your dashboards work without editing code:
1. In your GitHub repository, create a folder named `dashboards` (inside the `public` folder if it exists, or at the top level).
2. Inside `dashboards`, create `test-folder`.
3. Create a file inside `test-folder` named `index.html`. 
4. Paste this code into that file: 
   `<h1>Success! Dashboard Loaded.</h1><p>Relative paths will work from here.</p>`
5. In `constants.tsx`, add this line to any category:
   `{ name: "Live Test", path: "/dashboards/test-folder/index.html" }`
6. Push to GitHub. Visit your live URL and click "Live Test."

## 2. Test Admin Features
1. Go to your live website.
2. Click **Login**.
3. Enter `admin` as the username (any password).
4. You will now see the **Admin Panel** link in the top right. 
5. Create a poll there and check the **Voter Polls** page to see it live.

## 3. Test Voter Registration
1. Click **Register**.
2. Enter any Name and any **5-digit number** for Voter ID (e.g., `55555`).
3. Follow the steps to create a dummy account.
4. Attempt to comment on a poll to verify your "Verified" status.

## 4. Troubleshooting Netlify
- **404 Errors:** If you click a dashboard and see "Not Found," ensure the folder name in GitHub matches exactly (including capitalization) the path you typed in `constants.tsx`.
- **Paths:** Always start paths with a `/`. Example: `/dashboards/expenses/file.html`.
