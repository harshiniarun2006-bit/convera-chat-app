# Convera — “Your people, your place.”

A real-time, cross-network messaging platform crafted with a cherry visual identity.

---

## 🍒 Overview & Brand Identity

- **Brand Name**: Convera
- **Tagline**: *Your people, your place.*
- **Palette**:
  - Deep Cherry: `#8F1238`
  - Dark Cherry: `#5C102A`
  - Cherry Red: `#C52B50`
  - Blush Pink: `#F7DCE3`
  - Soft Rose: `#FCECF0`
  - Cream White: `#FFF9F7`
  - Dark Plum (Dark Mode): `#21131D` / `#170C15`

---

## 🚀 Key Features

1. **Real-Time Cross-Network Messaging**:
   - Backed by Cloud Firestore real-time snapshots (`onSnapshot`).
   - Genuinely independent users can chat across separate devices, mobile data (4G/5G), and different Wi-Fi networks.
   - Message persistence across browser refresh, sign-out, and reconnection.

2. **Authentication & Identity**:
   - Email/password registration and sign-in.
   - One-click Google Sign-In with popup.
   - Password reset via email.
   - Unique `@username` registry (`usernames/{username}`) preventing duplicate handles.
   - Custom avatar generator & presets.

3. **Direct & Group Conversations**:
   - Exact username discovery (`@username`) and display name search.
   - Deterministic conversation IDs preventing duplicate direct chat creation.
   - Multi-user group chats with group name, description, avatar, and admin privileges.

4. **Rich Communication**:
   - Text messages with line breaks and emoji support.
   - Photo and image sharing with full-screen lightbox viewer.
   - Document and file attachments.
   - Voice audio recording with custom `AudioPlayer` scrubber and waveforms.
   - Message replies with quote banner.
   - Emoji message reactions (❤️, 🍒, 👍, 😂, 😮, 🔥) with active counts.
   - Message editing with `(edited)` indicators.
   - Message soft deletion.
   - In-chat message search.

5. **Presence & Ephemeral States**:
   - Online/offline presence indicators.
   - Real-time typing indicators with debounce and auto-expiry.
   - Unread message tracking and delivery checkmarks.

6. **Voice & Audio Call Interface**:
   - In-app encrypted voice call modal with duration timer, mute controls, and cherry pulse waves.

7. **Themes & Customization**:
   - Polished light theme (Cream & Rose) and dark theme (Dark Plum & Velvet Cherry).
   - User privacy controls (read receipts, last seen privacy).

---

## 🛡️ Security & Access Control (ABAC)

The app is protected by strict Cloud Firestore Security Rules (`firestore.rules`):
- **Default Deny Catch-All**: Blocks unauthorized access across all collections.
- **Conversation Membership Gate**: Only participants listed in `participantIds` can read, query, or write messages in that conversation.
- **Ownership Verification**: Users cannot spoof message sender IDs (`incoming().senderId == request.auth.uid`), nor edit or delete other users' messages.
- **Username Index**: Protects unique `@username` claims.

---

## 📱 How to Test Multi-User Cross-Device Chat

1. **Window 1 (or Phone / Device A)**:
   - Click **Create Account** or click **Prefill User 1 (@alex)**.
   - Choose a password and click **Create Convera Account**.
2. **Window 2 (Incognito / Device B / Mobile)**:
   - Click **Create Account** or click **Prefill User 2 (@sam)**.
   - Create account and sign in.
3. **Start Chatting**:
   - On Device A, click **New Direct Chat** (`+`).
   - Type `@sam` or `Sam` and click **Chat**.
   - Send text, voice recordings, emojis, or photos.
   - Notice instant arrival on Device B in real-time without page reloads!
