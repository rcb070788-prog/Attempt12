
# Concerned Citizens of MC: Build & Launch Guide

Follow these simple steps to go from zero to a live website. No coding required.

## 1. Step-by-Step Launch
1. **Buy Your Domain:**
   - Go to [Namecheap.com](https://namecheap.com) or [Google Domains](https://domains.google).
   - Search for `concernedcitizensofMC.com` and purchase it (~$12/year).

2. **Set Up Hosting (The "Server"):**
   - We recommend **Firebase** (by Google) because it is free for small sites.
   - Go to [firebase.google.com](https://firebase.google.com) and create a project.
   - In the "Hosting" tab, click "Get Started."

3. **Connecting the Domain:**
   - In Firebase Hosting, click "Add Custom Domain."
   - Follow the instructions to copy a small piece of text into your Namecheap settings (this proves you own the domain).

---

## 2. Drop-in Dashboard System
The site is built to handle your folders automatically. You just need to follow these naming rules.

### Your Folder Structure
You must upload your folders exactly like this to the `public/dashboards` folder:

```
/public
  /dashboards
    /expenses
      /fund141
        index.html (Your working dashboard)
        /data (Your CSV files)
        /pdf (Your PDF documents)
      /new_fund_2024
        index.html
        ...
    /revenues
    /assets
    /liabilities
```

### How to update the list:
1. Open the file `constants.tsx` in this code.
2. Find the `DASHBOARD_CONFIG` section.
3. Add a new line for your new folder. Example:
   `{ name: "New Year Report", path: "/dashboards/expenses/new_year/index.html" }`
4. The website will automatically create the button and link to it.

---

## 3. The Voter List (Verification)
To keep the voter list secure (so people can't steal it), you will use **Firebase Cloud Functions**.

1. **The Voter CSV:** Prepare a CSV with two columns: `Name` and `VoterID`.
2. **Upload:** Upload this file to your Firebase "Private Storage" (not the Public folder).
3. **The Check:** When a user tries to sign up, the website sends the data to a private Google server (Cloud Function) that checks the list and sends back a "Yes" or "No."

---

## 4. Admin Checklist
- **Add a new Year/Fund:** Drop folder in `/dashboards/` -> Update `constants.tsx`.
- **Add a Poll:** Go to the "Firebase Firestore" dashboard -> Click "Add Document" in the "Polls" collection.
- **Moderate Comments:** Go to "Firebase Firestore" -> "Comments" collection -> Delete any offensive entries.

---

## 5. Monthly Cost Estimates
- **Domain:** ~$1/month ($12 yearly).
- **Hosting (Firebase):** $0 (Free tier covers most small community sites).
- **Voter Verification (Database):** $0 (Free tier up to 50,000 users).
- **Email (SendGrid):** $0 (Free tier up to 100 emails/day).
- **SMS (Twilio):** ~$0.01 per text (Pay as you go).

---

## 6. Risks & Backups
- **Security:** We never store Voter IDs in the "User Profile." We only use them once to verify and then throw them away to protect privacy.
- **Backup Strategy:** Once a month, log in to Firebase and click "Export Data." Download your dashboard folders to a local thumb drive.
- **Spam:** Only verified voters can comment, which naturally prevents 99% of bots and anonymous trolls.
