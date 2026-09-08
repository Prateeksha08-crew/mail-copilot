# Postbox

A mail client where the AI doesn't just answer questions it actually drives the app. Tell it "send an email to Rohit about the Q2 deck" and you watch the compose form fill itself in, field by field. Tell it "show me unread mail from the last week" and the inbox re-filters right there in front of you. It's a copilot for the UI, not a chatbot bolted onto the side of one.

I built this on Next.js, wired to the Gmail API for the actual mail, with Claude handling the natural-language side through tool calling instead of me trying to regex-parse whatever text comes back.
<img width="960" height="540" alt="image" src="https://github.com/user-attachments/assets/7a9e7674-949b-44c3-ab44-c437a1da0660" />

## Why it's built the way it is

The thing I cared about most here wasn't getting the assistant to *sound* smart it was making sure it couldn't do anything sneaky. So the assistant and the regular UI go through the exact same code path. When you click "Compose," it calls a function. When you tell the assistant "send an email to...", it resolves to the *same* function call. There's no separate, more powerful path the assistant has access to that the UI doesn't. Concretely: the assistant can fill out a compose form, but there is no action type in its schema that sends mail  sending only ever happens when a human clicks the Send button. That's not a rule I asked the model to follow nicely; it's just not a capability it has.

I also went with Claude's tool-use API instead of asking it to "reply only in JSON." Early on I was worried about the model wrapping its answer in markdown fences or adding a stray sentence before the JSON, and tool calling sidesteps that whole problem  you get structured input back, not a string you have to hope parses correctly.

## What's actually in here

- **Gmail integration** - real send/receive through the Gmail API, OAuth2 login flow
- **Inbox, Sent, Compose, and a message detail view** - the basic mail client parts
- **Real-time sync**- Gmail pushes a notification through Pub/Sub whenever your mailbox changes, which gets forwarded to the browser over Server-Sent Events, so new mail shows up without refreshing
- **The assistant panel** - compose, search/filter, navigate, open a specific email, reply to whatever's currently open, all through plain English
- **Filters** - by sender, keyword, date range, read/unread - that work identically whether you use the dropdowns or just ask the assistant
- **A mock-data mode** - an in memory sample mailbox (using Indian names/addresses, since that's who I was building this for) that kicks in automatically if you haven't set up Google OAuth yet, so you can try the whole thing out in about two minutes

## Running it

**1. Install dependencies**
```bash
npm install
```

**2. Set up your environment**
```bash
cp .env.example .env.local
```
At minimum, drop in your Anthropic API key. Leave the Google fields blank for now that's what triggers mock mode.

**3. Run it**
```bash
npm run dev
```
Open `http://localhost:3000`. You'll land straight in a sample inbox try typing something like "open the latest email from Ananya" into the assistant panel.

**4. Hooking up real Gmail** (optional, once you want to go beyond the sample data)

You'll need a Google Cloud project with the Gmail API turned on, and an OAuth client ID/secret. Fill those into `.env.local`, restart the server, and you'll get a "Connect Gmail" screen instead of the mock inbox. For real-time sync you'll also need a Pub/Sub topic and a push subscription pointed at `/api/pubsub`  since Pub/Sub can't reach `localhost` directly, I used `ngrok` to test that part locally.

## How it's organized

```
app/api/gmail/*      → thin routes, no Gmail-specific logic lives here
app/api/assistant/   → takes a command + current app state, returns one action
lib/gmail.ts          → the only file that talks to the Gmail API directly
lib/assistant.ts      → the only file that talks to the Anthropic API directly
hooks/useMailState.ts → all UI state lives here this is the file that
                         matters most, since both manual clicks and
                         assistant actions run through it
components/*          → dumb, presentational state and callbacks come in as props
```

If I were swapping Gmail for Outlook later, `lib/gmail.ts` is the only file I'd need to replace everything above it just expects a list of messages back, it doesn't know or care where they came from.

## Trade-offs I made on purpose

- **Tokens live in a cookie, not a database.** Fine for one person testing this locally. Not fine for multiple users or multiple devices that'd need a real user table.
- **Real-time sync uses a single in-memory event emitter.** Works great on one server. If this ever ran on more than one instance behind a load balancer, an event on server A would never reach a browser connected to server B I'd swap in Redis pub/sub for that.
- **No thread view.** Replies are threaded correctly on Gmail's side (right `In-Reply-To` headers and all), but the UI shows a flat list rather than grouping a conversation together. The data's there; the UI for it isn't, yet.
- **One assistant action per command.** "Reply to this" works in a single round trip. Something like "find Sarah's email and forward it to David, but check with me first" would need multi-step reasoning I haven't built.

## What I'd do next with more time

- A real user/session table instead of the cookie hack
- Thread grouping in the inbox
- Let the assistant forward, not just reply (the manual UI already can  the assistant's action schema just doesn't have that verb yet)
- Optimistic UI updates so actions feel instant instead of waiting on a round trip
- Basic rate-limit handling for when the Gmail API quota gets hit
