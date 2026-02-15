# Contributing to Hamahang

Thank you for your interest in contributing to Hamahang! This project is dedicated to the people of Iran.

## Getting Started

1. **Fork** this repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/hamahang.git
   cd hamahang
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials and other required values.

5. **Run the app:**
   ```bash
   npm run web
   ```

## Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Test your changes locally on web and/or mobile
4. Commit with a clear message:
   ```bash
   git commit -m "feat: add your feature description"
   ```
5. Push to your fork and open a Pull Request

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `refactor:` code changes that don't add features or fix bugs
- `chore:` maintenance tasks

## Code Style

- TypeScript throughout
- React hooks and functional components
- RTL-first UI (the app is primarily in Farsi)

## Reporting Issues

Open an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Platform (web, iOS, Android)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
