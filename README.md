<h1 align="center">
  <a href="https://discord.com/oauth2/authorize?client_id=1489362526880796903" target="_blank">
      Pocket Tool Discord Bot
  </a>
</h1>

> A lightweight multi-purpose Discord bot made to be used anywhere at any time!

## Why use Pocket Tool?

Pocket Tool is a **lightweight, fast, and versatile Discord bot** designed to be your all-in-one utility companion. Whether you're looking to enhance productivity, moderate your server, or add fun features, Pocket Tool has you covered.

> _You can also try [Pocket Tool Canary](https://discord.com/oauth2/authorize?client_id=1489363092071518324) to access the latest features early. Note that it may be unstable and occasionally offline._

## How do I self-host Pocket Tool?

- [Node.js](https://nodejs.org/) (v20+ recommended)
- A Discord bot token (set as `token` environment variable)

1. Clone the repository:

```bash
git clone https://github.com/mloetta/pocket-tool
cd pocket-tool
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Edit the `.env` file to add your bot token and other configuration options.

5. Build and run the bot:

```bash
npm run build
npm run start
```

> If you prefer an easier setup, you can simply [add Pocket Tool](https://discord.com/oauth2/authorize?client_id=1489362526880796903)!
