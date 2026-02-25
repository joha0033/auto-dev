# 🎪 Auto-Dev: The Jira Webhook Circus 🎭

> *Where Jira tickets go to party and webhooks have all the fun!*

[![Made with Fastify](https://img.shields.io/badge/Made%20with-Fastify-000000?style=flat-square&logo=fastify)](https://www.fastify.io/)
[![Powered by Coffee](https://img.shields.io/badge/Powered%20by-Coffee%20%E2%98%95-brown?style=flat-square)](https://en.wikipedia.org/wiki/Coffee)
[![Bugs Fixed](https://img.shields.io/badge/Bugs%20Fixed-Maybe-yellow?style=flat-square)](https://github.com)

## 🤔 What Even Is This?

Ever wondered what happens when a Jira ticket throws a party? **Auto-Dev** is here to RSVP! 

This is a lightning-fast ⚡ Fastify-powered webhook handler that catches Jira events faster than you can say "sprint planning meeting." It's like having a bouncer at the door of your development workflow, except this bouncer actually does something useful.

### 🎯 Features That'll Make You Go "Huh, That's Actually Cool"

- **🚀 Blazingly Fast**: Built on Fastify because we don't have time for slow webhooks
- **🔌 Webhook Ready**: Catches Jira events like a pro baseball player catches fly balls
- **🐛 Typo-Tolerant**: We misspell things so you don't have to! (Check out our `/webooks` endpoint - yes, really)
- **📝 Raw Body Access**: Because sometimes you need to know exactly what Jira said
- **🎪 Hello World**: Of course we have a "hello world" endpoint. We're professionals!

## 🛠️ Installation (AKA The "How Do I Make This Thing Work?" Section)

### Prerequisites

- **Node.js** (the newer the better, just like memes)
- **pnpm** (because we're fancy like that 💅)
- **A Jira instance** (or just dreams of one)

### Let's Get This Party Started

```bash
# Clone this bad boy
git clone <your-repo-url>
cd auto-dev

# Install the goods
pnpm install

# Set up your environment (don't skip this or things will get awkward)
cp .env.example .env
# Edit .env with your secret sauce
```

## 🎮 Usage (The Fun Part!)

### Start the Server

**Development Mode** (with hot reload because we're not monsters):
```bash
pnpm dev
```

**Production Mode** (when you're ready to face the real world):
```bash
pnpm start
```

The server will wake up at `http://localhost:3000` and start listening for Jira's gossip.

### Available Endpoints (Where the Magic Happens ✨)

#### `GET /`
The classic "is this thing on?" endpoint.

**Response:**
```json
{
  "hello": "world"
}
```

*Fun fact: This endpoint has been bringing joy to developers since 1991. (Disclaimer: Not actually true.)*

#### `POST /webhooks/jira`
The main event! This is where Jira sends all its juicy updates.

#### `POST /webooks/jira`
The "oops we made a typo but decided to keep it" endpoint. Because everyone makes typos, and we're all about embracing our imperfections! 🤗

## 🏗️ Project Structure

```
auto-dev/
├── src/
│   ├── index.js           # Where the magic begins 🪄
│   ├── lib/               # The utility drawer
│   └── routes/
│       └── webhooks/      # Webhook central station
├── package.json           # The recipe book
└── README.md             # You are here! 📍
```

## 🧪 Testing

```bash
pnpm test
```

*Note: Currently returns "Error: no test specified" which is basically a test of your ability to handle disappointment. We're working on it! 😅*

## 🤝 Contributing

Found a bug? Want to add a feature? Think our typo endpoint is hilarious and want to add more?

1. Fork it 🍴
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request and make our day! 🎉

## 📜 License

ISC - Because we believe in keeping things simple.

## 🎭 Fun Facts

- This README was made more fun on Feb 25, 2026
- The `/webooks` typo has been preserved as a monument to human error
- We use pnpm because we're sophisticated like that
- Yes, we know "webooks" isn't a word. Yes, we're keeping it.

## 🆘 Need Help?

If you're stuck, remember: 
1. Read the error message
2. Google the error message
3. Question your life choices
4. Try turning it off and on again
5. Actually read the documentation
6. Success! 🎊

---

<div align="center">

**Made with ❤️, ☕, and a healthy dose of 🤪**

*Remember: Code is poetry, but sometimes it's also a limerick.*

</div>
