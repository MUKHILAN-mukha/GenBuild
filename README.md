# Rapid Prototype Championship - Event Deployment Guide

This guide explains how to pull the source code onto your central Hub computer and run the entire event over your Local Area Network (LAN). No internet is required once the code is downloaded.

## Prerequisites (On the Hub Computer)
Make sure the central Hub computer has **Node.js** installed.
- If you don't have it, download and install it from [nodejs.org](https://nodejs.org).
- You do **not** need to install anything on the student computers.

---

## Step 1: Download & Start the Server

1. **Download the code:**
   Open a terminal (Command Prompt or PowerShell) and run:
   ```bash
   git clone https://github.com/MUKHILAN-mukha/GenBuild.git
   cd GenBuild
   ```

2. **Install dependencies:**
   Inside the `GenBuild` folder, run:
   ```bash
   npm install
   ```
   *(Note: You only need to do this once. Since the `dist/` production frontend is already built and included, you don't even need to run `npm run build`!).*

3. **Start the Master Server:**
   In the same terminal, run:
   ```bash
   node server.js
   ```
   Leave this terminal window open for the entire duration of the event. If you close it, the server turns off.

4. **Find your Local IP Address:**
   Once you run `node server.js`, the terminal will automatically print a message that looks like this:
   ```text
   RAPID PROTOTYPE CHAMPIONSHIP SERVER
   ────────────────────────────
   Hub / Admin  : http://localhost:3000/hub
   Participants : http://192.168.1.50:3000/seat
   ────────────────────────────
   ```
   The `192.168.1.50` (or `10.x.x.x` depending on your network) is your Hub computer's IP address. Write this down! This exact `Participants` link is what you will give to the students. 
   *(Alternatively, you can always open a new Command Prompt, type `ipconfig`, and look for the "IPv4 Address").*

---

## Step 2: Open the Windows Firewall
By default, Windows blocks other computers from talking to yours. You must explicitly open port `3000` so the student PCs can connect to the Hub PC.

1. Press the Windows Key and type **"Windows Defender Firewall"**, then press Enter.
2. Click **"Advanced Settings"** on the left side menu.
3. Click **"Inbound Rules"** in the left panel, then click **"New Rule..."** in the far right panel.
4. Select **Port** and click Next.
5. Select **TCP** and enter **3000** for "Specific local ports". Click Next.
6. Select **Allow the connection**. Click Next.
7. Check all boxes (Domain, Private, Public). Click Next.
8. Name it "Hackathon Server" and click **Finish**.

---

## Step 3: Open the Admin Hub
On the Hub computer (the one connected to the projector):
1. Open Google Chrome.
2. Navigate to **`http://localhost:3000/hub`**.
3. Put the browser in Fullscreen mode (press **F11**) and project it onto the big screen.
4. When prompted, enter the default PIN: `1234`.

---

## Step 4: Connect the Student Computers
On every student computer in the lab, they only need a web browser. 

1. Write the Participant URL from Step 1 on the whiteboard or display it on the projector.
   *(Example: **`http://192.168.1.50:3000/seat`**)*
2. When students type that URL into Google Chrome on their lab computers, they will see the Seat Selector grid.
3. They click their physical computer number (e.g., C-24) and type their Team Name to lock in.
4. You will instantly see them pop up on your projector screen!

*(Pro-tip: If you want to force Chrome into Kiosk mode on the student PCs before they arrive so they can't change tabs, you can open Command Prompt on their machine and run: `chrome.exe --kiosk "http://192.168.1.50:3000/seat?seat=C-24"`).*

---

## Step 5: Run the Event!
1. Wait until the "Online" counter on your Hub dashboard matches the number of teams sitting in the lab.
2. Click **"Start Reveal"** on your Hub. All 60 student computers will perfectly sync, play the slot-machine animation, and reveal their specific scenario (out of the 5 you provided).
3. Click **"Start Timer"** on your Hub. The 90-minute countdown will begin on every single screen simultaneously!
